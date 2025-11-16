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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberActivity";

/**
 * Test member activity retrieval sorted by creation date.
 *
 * This test validates that the member activity API correctly returns activities
 * (posts and comments) sorted by creation date with proper chronological
 * ordering. The test creates multiple posts at different time intervals and
 * verifies that:
 *
 * 1. Activities are returned in correct chronological order when sorted by
 *    created_at descending
 * 2. Activities are returned in reverse chronological order when sorted by
 *    created_at ascending
 * 3. The created_at timestamp is immutable and accurately reflects post creation
 *    time
 * 4. Pagination works correctly with sorted results
 * 5. Timestamps remain consistent across multiple retrievals
 *
 * Steps:
 *
 * 1. Create administrator account for category management
 * 2. Create member account for activity generation
 * 3. Create category for community classification
 * 4. Create community for posts
 * 5. Create multiple posts with delays to establish chronological sequence
 * 6. Retrieve activities sorted by created_at descending (newest first)
 * 7. Retrieve activities sorted by created_at ascending (oldest first)
 * 8. Validate chronological ordering in both directions
 * 9. Verify created_at immutability across retrievals
 */
export async function test_api_member_activity_sorted_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const administrator = await api.functional.auth.administrator.join(
    connection,
    { body: adminData },
  );
  typia.assert(administrator);

  // Step 2: Create member account for activity generation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Switch to member context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 3: Create category for community classification
  const categoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
    description: "Technology and software discussions",
    icon_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 4: Create community for posts
  const communityData = {
    name: "Tech Talk",
    identifier: RandomGenerator.alphaNumeric(8),
    description: "Discussion about technology",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "text_only" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 5: Create multiple posts with delays to establish chronological sequence
  const posts: ICommunityPlatformPost[] = [];

  for (let i = 0; i < 3; i++) {
    const postData = {
      community_id: community.id,
      post_type: "text" as const,
      title: `Post ${i + 1}: ${RandomGenerator.name()}`,
      content_text: RandomGenerator.paragraph({ sentences: 3 }),
      is_nsfw: false,
      has_spoiler: false,
    } satisfies ICommunityPlatformPost.ICreate;

    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      { body: postData },
    );
    typia.assert(post);
    posts.push(post);

    // Add small delay between posts to ensure different timestamps
    if (i < 2) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Verify posts were created in chronological order
  TestValidator.predicate(
    "posts should be created with increasing timestamps",
    posts[0].created_at <= posts[1].created_at &&
      posts[1].created_at <= posts[2].created_at,
  );

  // Step 6: Retrieve activities sorted by created_at descending (newest first)
  const activitiesDescending =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesDescending);

  TestValidator.predicate(
    "descending activities should have at least 3 items",
    activitiesDescending.data.length >= 3,
  );

  // Verify descending order (newest first)
  for (let i = 0; i < activitiesDescending.data.length - 1; i++) {
    TestValidator.predicate(
      `activity at index ${i} should have later or equal created_at than activity at index ${i + 1}`,
      activitiesDescending.data[i].createdAt >=
        activitiesDescending.data[i + 1].createdAt,
    );
  }

  // Step 7: Retrieve activities sorted by created_at ascending (oldest first)
  const activitiesAscending =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesAscending);

  TestValidator.predicate(
    "ascending activities should have at least 3 items",
    activitiesAscending.data.length >= 3,
  );

  // Verify ascending order (oldest first)
  for (let i = 0; i < activitiesAscending.data.length - 1; i++) {
    TestValidator.predicate(
      `activity at index ${i} should have earlier or equal created_at than activity at index ${i + 1}`,
      activitiesAscending.data[i].createdAt <=
        activitiesAscending.data[i + 1].createdAt,
    );
  }

  // Step 8: Verify reverse relationship between ascending and descending
  TestValidator.predicate(
    "first descending activity should match last ascending activity",
    activitiesDescending.data[0].id ===
      activitiesAscending.data[activitiesAscending.data.length - 1].id,
  );

  TestValidator.predicate(
    "last descending activity should match first ascending activity",
    activitiesDescending.data[activitiesDescending.data.length - 1].id ===
      activitiesAscending.data[0].id,
  );

  // Step 9: Retrieve activities again to verify created_at immutability
  const activitiesSecondRetrievalDesc =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesSecondRetrievalDesc);

  // Verify timestamps are immutable
  TestValidator.predicate(
    "activity count should be consistent across retrievals",
    activitiesDescending.data.length ===
      activitiesSecondRetrievalDesc.data.length,
  );

  for (let i = 0; i < activitiesDescending.data.length; i++) {
    TestValidator.equals(
      `activity ${i} created_at should remain unchanged`,
      activitiesDescending.data[i].createdAt,
      activitiesSecondRetrievalDesc.data[i].createdAt,
    );
  }

  // Verify pagination information is consistent
  TestValidator.equals(
    "pagination current page should match",
    activitiesDescending.pagination.current,
    activitiesSecondRetrievalDesc.pagination.current,
  );

  TestValidator.equals(
    "pagination records count should match",
    activitiesDescending.pagination.records,
    activitiesSecondRetrievalDesc.pagination.records,
  );
}
