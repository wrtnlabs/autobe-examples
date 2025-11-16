import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_posts_search_with_sorting(
  connection: api.IConnection,
) {
  // Setup: Create administrator for category creation
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Setup: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create member for community and posts
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Setup: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create multiple posts with different engagement metrics
  const posts: ICommunityPlatformPost[] = [];

  // Post 1: High vote score
  const post1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Highly Voted Post",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  posts.push(post1);

  // Post 2: Medium vote score, more comments
  const post2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Medium Voted Post with Comments",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  posts.push(post2);

  // Post 3: Low vote score, few comments
  const post3 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Low Voted Post",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post3);
  posts.push(post3);

  // Test 1: Sort by createdAt in descending order (newest first)
  const resultNewest = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        community_id: community.id,
        sort_by: "createdAt",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(resultNewest);
  TestValidator.predicate(
    "newest posts should be first when sorting by createdAt desc",
    resultNewest.data.length > 0 &&
      resultNewest.data[0].created_at >=
        resultNewest.data[resultNewest.data.length - 1].created_at,
  );

  // Test 2: Sort by createdAt in ascending order (oldest first)
  const resultOldest = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        community_id: community.id,
        sort_by: "createdAt",
        sort_order: "asc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(resultOldest);
  TestValidator.predicate(
    "oldest posts should be first when sorting by createdAt asc",
    resultOldest.data.length > 0 &&
      resultOldest.data[0].created_at <=
        resultOldest.data[resultOldest.data.length - 1].created_at,
  );

  // Test 3: Sort by voteScore in descending order (highest score first)
  const resultVoteScoreDesc =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 100,
        community_id: community.id,
        sort_by: "voteScore",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(resultVoteScoreDesc);
  TestValidator.predicate(
    "posts should be sorted by vote score descending",
    resultVoteScoreDesc.data.length > 0,
  );

  // Test 4: Sort by voteScore in ascending order (lowest score first)
  const resultVoteScoreAsc = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        community_id: community.id,
        sort_by: "voteScore",
        sort_order: "asc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(resultVoteScoreAsc);
  TestValidator.predicate(
    "posts should be sorted by vote score ascending",
    resultVoteScoreAsc.data.length > 0,
  );

  // Test 5: Sort by upvoteCount in descending order
  const resultUpvoteDesc = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        community_id: community.id,
        sort_by: "upvoteCount",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(resultUpvoteDesc);
  TestValidator.predicate(
    "posts should be sorted by upvote count descending",
    resultUpvoteDesc.data.length > 0,
  );

  // Test 6: Sort by commentCount in descending order
  const resultCommentDesc = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        community_id: community.id,
        sort_by: "commentCount",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(resultCommentDesc);
  TestValidator.predicate(
    "posts should be sorted by comment count descending",
    resultCommentDesc.data.length > 0,
  );

  // Test 7: Sort by commentCount in ascending order
  const resultCommentAsc = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        community_id: community.id,
        sort_by: "commentCount",
        sort_order: "asc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(resultCommentAsc);
  TestValidator.predicate(
    "posts should be sorted by comment count ascending",
    resultCommentAsc.data.length > 0,
  );

  // Test 8: Pagination with sorting
  const resultPage1 = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
        community_id: community.id,
        sort_by: "createdAt",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(resultPage1);
  TestValidator.predicate(
    "first page should have correct limit",
    resultPage1.data.length <= 2,
  );

  // Test 9: Verify sort order consistency across multiple requests
  const resultConsistency1 = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        community_id: community.id,
        sort_by: "voteScore",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(resultConsistency1);

  const resultConsistency2 = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        community_id: community.id,
        sort_by: "voteScore",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(resultConsistency2);

  TestValidator.equals(
    "sort order should be consistent across requests",
    resultConsistency1.data.map((p) => p.id),
    resultConsistency2.data.map((p) => p.id),
  );

  // Test 10: Sort with filter (NSFW exclusion)
  const resultFiltered = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        community_id: community.id,
        sort_by: "createdAt",
        sort_order: "desc",
        exclude_nsfw: true,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(resultFiltered);
  TestValidator.predicate(
    "filtered results should not contain NSFW posts",
    resultFiltered.data.every((p) => p.is_nsfw === false),
  );
}
