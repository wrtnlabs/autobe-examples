import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchIndex";
import type { ICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchResult";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchResult";

export async function test_api_search_engagement_filter(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: "TestPassword123!",
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create posts with varying comment counts
  const postWithNoComments =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Post with no comments " + RandomGenerator.alphabets(5),
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postWithNoComments);

  const postWithFiveComments =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Post with five comments " + RandomGenerator.alphabets(5),
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postWithFiveComments);

  // Add 5 comments to the second post
  for (let i = 0; i < 5; i++) {
    const comment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: postWithFiveComments.id,
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
  }

  const postWithTenComments =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Post with ten comments " + RandomGenerator.alphabets(5),
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postWithTenComments);

  // Add 10 comments to the third post
  for (let i = 0; i < 10; i++) {
    const comment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: postWithTenComments.id,
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
  }

  // Step 4: Test search with minComments=0 (should return all posts)
  const searchResultAll = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: "comments",
        page: 1,
        limit: 100,
        minComments: 0,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(searchResultAll);
  TestValidator.predicate(
    "search with minComments=0 should return posts matching keyword",
    searchResultAll.data.length >= 3,
  );

  // Step 5: Test search with minComments=5 (should return posts with 5+ comments)
  const searchResultFivePlus =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "comments",
        page: 1,
        limit: 100,
        minComments: 5,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResultFivePlus);

  // Verify that only posts with 5+ comments are returned
  for (const result of searchResultFivePlus.data) {
    if (result.post) {
      TestValidator.predicate(
        "post should have at least 5 comments",
        result.post.comment_count >= 5,
      );
    }
  }

  // Step 6: Test search with minComments=10 (should return only post with 10+ comments)
  const searchResultTenPlus =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "comments",
        page: 1,
        limit: 100,
        minComments: 10,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResultTenPlus);

  // Verify that only posts with 10+ comments are returned
  for (const result of searchResultTenPlus.data) {
    if (result.post) {
      TestValidator.predicate(
        "post should have at least 10 comments",
        result.post.comment_count >= 10,
      );
    }
  }

  // Step 7: Test that AND logic applies - search with keyword AND minComments
  const searchResultCombined =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "Post with five",
        page: 1,
        limit: 100,
        minComments: 10,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResultCombined);

  // Should not return the "Post with five comments" because it doesn't meet minComments=10
  const hasPostWithFive = searchResultCombined.data.some((r) =>
    r.post?.title.includes("five"),
  );
  TestValidator.predicate(
    "AND logic: post with 5 comments should not appear when minComments=10",
    !hasPostWithFive,
  );

  // Step 8: Test pagination metadata
  TestValidator.predicate(
    "pagination should contain current page information",
    searchResultAll.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should contain limit information",
    searchResultAll.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should contain records count",
    searchResultAll.pagination.records >= 0,
  );
}
