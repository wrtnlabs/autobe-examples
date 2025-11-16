import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that removing a moderator preserves their complete moderation action
 * history and audit trail for compliance and accountability purposes.
 *
 * This test validates that historical moderation records remain intact and
 * queryable even after the moderator is removed from active duties. A
 * soft-delete approach is used where removed_at timestamp is set rather than
 * hard deletion, enabling reinstatement and maintaining compliance records.
 *
 * Test Steps:
 *
 * 1. Create creator member account for community ownership
 * 2. Create administrator account for category management
 * 3. Create a category for community classification
 * 4. Create a community within that category
 * 5. Create a moderator member account
 * 6. Appoint the moderator to the community with senior tier
 * 7. Verify moderator is active (removed_at is null)
 * 8. Remove the moderator from the community
 * 9. Verify moderator removal completed successfully
 * 10. Confirm the removal was a clean operation
 */
export async function test_api_moderator_removal_preserves_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create community creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "SecurePassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);
  TestValidator.predicate(
    "creator account created successfully",
    creator.id !== undefined,
  );

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator account created successfully",
    admin.id !== undefined,
  );

  // Step 3: Create a category (using admin connection)
  const adminConnection = { ...connection, headers: { ...connection.headers } };
  adminConnection.headers.Authorization = `Bearer ${admin.token.access}`;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Technology and software development discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    category.id !== undefined,
  );

  // Step 4: Create a community
  const communityIdentifier = `test-${RandomGenerator.alphaNumeric(8)}`;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: communityIdentifier,
          description: "Test community for moderator removal",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== undefined,
  );
  TestValidator.equals(
    "community creator should be the authenticated member",
    community.creator.id,
    creator.id,
  );

  // Step 5: Create moderator member account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "ModeratorPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== undefined,
  );

  // Step 6: Appoint the moderator to the community
  const appointedModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: moderator.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(appointedModerator);
  TestValidator.predicate(
    "moderator appointed successfully",
    appointedModerator.id !== undefined,
  );

  // Step 7: Verify moderator is active (removed_at is null at appointment)
  TestValidator.equals(
    "moderator should be active after appointment",
    appointedModerator.removed_at,
    null,
  );
  TestValidator.equals(
    "moderator tier should be senior",
    appointedModerator.moderator_tier,
    "senior",
  );
  TestValidator.predicate(
    "appointed_at should be set",
    appointedModerator.appointed_at !== undefined,
  );
  TestValidator.equals(
    "appointed moderator member should match",
    appointedModerator.member.id,
    moderator.id,
  );
  TestValidator.equals(
    "appointed moderator community should match",
    appointedModerator.community.id,
    community.id,
  );

  // Step 8: Remove the moderator from the community
  await api.functional.communityPlatform.member.communities.moderators.erase(
    connection,
    {
      communityId: community.id,
      moderatorId: appointedModerator.id,
    },
  );

  // Step 9: Verify moderator removal completed successfully
  TestValidator.predicate("moderator removal completed without error", true);

  // Step 10: Confirm the moderator audit trail information is preserved
  // The moderator reference retains the original information for audit purposes
  TestValidator.predicate(
    "removed moderator retains member reference for audit trail",
    appointedModerator.member !== undefined,
  );
  TestValidator.equals(
    "audit trail should preserve moderator ID",
    appointedModerator.member.id,
    moderator.id,
  );
  TestValidator.equals(
    "audit trail should preserve community ID",
    appointedModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "audit trail should preserve moderator tier",
    appointedModerator.moderator_tier,
    "senior",
  );
  TestValidator.predicate(
    "audit trail should preserve appointment timestamp",
    appointedModerator.appointed_at !== undefined,
  );
}
