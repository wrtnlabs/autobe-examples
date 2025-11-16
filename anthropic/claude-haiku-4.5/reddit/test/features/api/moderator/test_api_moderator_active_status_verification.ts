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
 * Test moderator active status verification with soft-delete mechanism
 *
 * This test validates that active moderators are correctly distinguished from
 * inactive ones by verifying the removed_at field is null for active
 * moderators. The test creates a complete workflow: setting up administrator
 * and member accounts, creating a community, appointing a moderator, and
 * retrieving moderator details to verify active status indication.
 *
 * Steps:
 *
 * 1. Create administrator account for authorization
 * 2. Create member account for community participation
 * 3. Authenticate as member to perform community creation
 * 4. Create a category for community classification
 * 5. Create a community as the member
 * 6. Appoint a moderator with senior tier to the community
 * 7. Switch authentication to administrator
 * 8. Retrieve the moderator details via administrator endpoint
 * 9. Verify moderator active status (removed_at is null)
 * 10. Confirm moderator tier and appointment timestamps are correct
 * 11. Validate that full moderator context is provided in response
 */
export async function test_api_moderator_active_status_verification(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: "admin_" + RandomGenerator.alphaNumeric(8),
        name: "Test Administrator",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account for community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberCreator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: "member_" + RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberCreator);

  // Step 3: Create another member to be appointed as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: moderatorEmail,
        username: "moderator_" + RandomGenerator.alphaNumeric(8),
        password: "ModeratorPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(moderatorMember);

  // Step 4: Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Authenticate as community creator member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 6: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 7: Appoint the moderator member with senior tier
  const moderator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: moderatorMember.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  TestValidator.equals(
    "moderator tier is senior",
    moderator.moderator_tier,
    "senior",
  );

  // Step 8: Switch to administrator authentication
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 9: Retrieve moderator details via administrator endpoint
  const retrievedModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.administrator.communities.moderators.at(
      connection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
      },
    );
  typia.assert(retrievedModerator);

  // Step 10: Verify moderator active status - removed_at should be null for active moderators
  TestValidator.equals(
    "active moderator has null removed_at",
    retrievedModerator.removed_at,
    null,
  );
  TestValidator.predicate(
    "moderator tier is preserved",
    retrievedModerator.moderator_tier === "senior",
  );

  // Step 11: Verify moderator details match appointed moderator
  TestValidator.equals(
    "retrieved moderator id matches",
    retrievedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator member id matches",
    retrievedModerator.member.id,
    moderatorMember.id,
  );
  TestValidator.equals(
    "community id matches",
    retrievedModerator.community.id,
    community.id,
  );

  // Step 12: Verify appointment timestamps exist for active moderator
  TestValidator.predicate(
    "appointed_at timestamp exists",
    retrievedModerator.appointed_at !== null &&
      retrievedModerator.appointed_at !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedModerator.created_at !== null &&
      retrievedModerator.created_at !== undefined,
  );
}
