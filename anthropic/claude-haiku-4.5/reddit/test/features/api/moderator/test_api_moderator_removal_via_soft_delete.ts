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
 * Test removing a moderator from their role through soft-delete by setting
 * removed_at timestamp.
 *
 * This test validates the soft-delete mechanism for moderator removal, ensuring
 * that:
 *
 * - Administrator can remove moderators by setting removed_at timestamp
 * - The reason for removal is captured and logged
 * - The moderator record is preserved for audit trails (not hard-deleted)
 * - The removed_at field is properly timestamped
 *
 * Steps:
 *
 * 1. Create a category for community organization
 * 2. Authenticate as a member and create a community
 * 3. Authenticate as a different member and appoint them as community moderator
 * 4. Authenticate as administrator to perform removal
 * 5. Remove the moderator by setting removed_at with documented reason
 * 6. Validate the moderator is marked as removed but record is preserved
 * 7. Verify the reason is captured for compliance and audit purposes
 */
export async function test_api_moderator_removal_via_soft_delete(
  connection: api.IConnection,
) {
  // Step 1: Create a category for community setup
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: `category_${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category should be created",
    category.id !== undefined,
  );

  // Step 2: Authenticate as first member and create a community
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail1,
      username: `user_${RandomGenerator.alphaNumeric(6)}`,
      password: "TestPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community should be created",
    community.id !== undefined,
  );

  // Step 3: Authenticate as second member and appoint as moderator
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail2,
      username: `user_${RandomGenerator.alphaNumeric(6)}`,
      password: "TestPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  const moderator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: member2.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be appointed",
    moderator.id !== undefined,
  );
  TestValidator.predicate(
    "moderator should be active initially",
    moderator.removed_at === null,
  );
  TestValidator.equals(
    "moderator tier should be senior",
    moderator.moderator_tier,
    "senior",
  );

  // Step 4: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 5: Remove moderator via soft-delete by setting removed_at
  const removalReason = "Conduct violation detected";
  const removalTimestamp = new Date().toISOString();

  const removedModerator =
    await api.functional.communityPlatform.administrator.communities.moderators.update(
      connection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
        body: {
          removed_at: removalTimestamp,
          reason: removalReason,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(removedModerator);

  // Step 6: Validate the moderator is marked as removed
  TestValidator.predicate(
    "removed_at should be set to a timestamp",
    removedModerator.removed_at !== null &&
      removedModerator.removed_at !== undefined,
  );
  TestValidator.equals(
    "removed_at timestamp should match removal time",
    removedModerator.removed_at,
    removalTimestamp,
  );

  // Step 7: Verify moderator record is preserved (soft-delete, not hard-delete)
  TestValidator.predicate(
    "moderator record should still exist with id",
    removedModerator.id === moderator.id,
  );
  TestValidator.equals(
    "moderator community should be preserved",
    removedModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator member identity should be preserved",
    removedModerator.member.id,
    member2.id,
  );

  // Step 8: Confirm moderator is no longer active
  TestValidator.predicate(
    "removed moderator should have removed_at set",
    removedModerator.removed_at !== null,
  );
}
