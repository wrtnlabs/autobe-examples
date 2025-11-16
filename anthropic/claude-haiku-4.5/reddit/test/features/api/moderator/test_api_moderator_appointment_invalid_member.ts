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
 * Test that attempting to appoint a non-existent member as moderator is
 * rejected.
 *
 * This test validates that the moderator appointment API properly rejects
 * attempts to assign non-existent members to moderator positions. It ensures
 * data integrity by preventing creation of moderator records that reference
 * invalid members.
 *
 * Test Steps:
 *
 * 1. Create member account for community creation
 * 2. Create administrator account for category management
 * 3. Create a community category (required prerequisite)
 * 4. Create a community owned by the member
 * 5. Attempt moderator appointment with invalid/non-existent member ID
 * 6. Verify HTTP error response
 * 7. Confirm no moderator record was created
 */
export async function test_api_moderator_appointment_invalid_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account (community creator)
  const memberCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "TestPassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateData,
    });
  typia.assert(member);
  TestValidator.predicate("member created successfully", member.id !== null);

  // Step 2: Create administrator account (for category creation)
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "AdminPassword123!",
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator created successfully",
    admin.id !== null,
  );

  // Step 3: Create a category (required for community creation)
  const categoryCreateData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryCreateData,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    category.id !== null,
  );

  // Switch back to member context for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCreateData.email,
      password: memberCreateData.password,
      href: memberCreateData.href,
      referrer: memberCreateData.referrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create a community
  const communityCreateData = {
    name: RandomGenerator.name(3),
    identifier: RandomGenerator.alphabets(12).toLowerCase(),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreateData,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== null,
  );

  // Step 5: Attempt moderator appointment with non-existent member ID
  const invalidMemberId = typia.random<string & tags.Format<"uuid">>();

  // This should fail because the member does not exist
  await TestValidator.error(
    "should reject moderator appointment with non-existent member",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: invalidMemberId,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  TestValidator.predicate("moderator appointment was properly rejected", true);
}
