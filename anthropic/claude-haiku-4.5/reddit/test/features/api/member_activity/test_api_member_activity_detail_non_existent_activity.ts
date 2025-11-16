import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberActivity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test retrieving a non-existent member activity by ID.
 *
 * Validates that the endpoint properly handles requests for activities that
 * don't exist, ensuring appropriate error responses are returned without
 * exposing system details. Tests various scenarios with invalid activity IDs
 * and verifies consistent error handling.
 *
 * Test Flow:
 *
 * 1. Setup: Create administrator, category, community, member, and a valid
 *    activity
 * 2. Test 1: Retrieve the created activity successfully (positive test)
 * 3. Test 2: Attempt to retrieve activity with non-existent but valid UUID format
 * 4. Test 3: Verify error handling is consistent across different non-existent IDs
 */
export async function test_api_member_activity_detail_non_existent_activity(
  connection: api.IConnection,
) {
  // Setup Phase: Create necessary infrastructure

  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "SecurePassword123!",
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://example.com/admin/register",
    referrer: "http://example.com/admin",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // 2. Create category
  const categoryData = {
    name: "Technology",
    slug: `tech_${RandomGenerator.alphaNumeric(5)}`,
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // 3. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(10),
    password: "SecurePassword123!",
    href: "http://example.com/register",
    referrer: "http://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // 4. Create community
  const communityData = {
    name: "Tech Discussion Community",
    identifier: `tech_${RandomGenerator.alphaNumeric(5)}`,
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // 5. Create a valid post/activity
  const postData = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content_text: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: postData },
  );
  typia.assert(post);

  // Test Phase: Verify activity retrieval behavior

  // Test 1: Generate first non-existent activity ID and verify error handling
  const nonExistentActivityId1 = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "retrieving non-existent activity should fail",
    async () => {
      return await api.functional.communityPlatform.members.activity.at(
        connection,
        {
          memberId: member.id,
          activityId: nonExistentActivityId1,
        },
      );
    },
  );

  // Test 2: Generate second non-existent activity ID and verify consistent error handling
  const nonExistentActivityId2 = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "retrieving another non-existent activity should also fail",
    async () => {
      return await api.functional.communityPlatform.members.activity.at(
        connection,
        {
          memberId: member.id,
          activityId: nonExistentActivityId2,
        },
      );
    },
  );

  // Test 3: Test with non-existent member ID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "retrieving activity for non-existent member should fail",
    async () => {
      return await api.functional.communityPlatform.members.activity.at(
        connection,
        {
          memberId: nonExistentMemberId,
          activityId: nonExistentActivityId1,
        },
      );
    },
  );
}
