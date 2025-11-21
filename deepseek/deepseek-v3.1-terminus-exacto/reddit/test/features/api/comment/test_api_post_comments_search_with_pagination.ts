import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Test comment search pagination functionality to validate proper handling of
 * large comment datasets. This test creates multiple comments on a single post
 * and verifies that the search operation correctly implements pagination with
 * proper page navigation, limit enforcement, and total record counting. The
 * test validates pagination parameters work correctly with various sorting
 * options.
 */
export async function test_api_post_comments_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create member authentication for comment creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to host multiple comments
  // Note: We need to use a valid community ID that exists in the system
  // Since we don't have a community creation API, we'll assume there's a default community
  // or use a known valid community ID from the system
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create multiple comments to test pagination limits
  const commentCount = 15;
  const createdComments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < commentCount; i++) {
    const comment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            body: `Test comment ${i + 1}: ${RandomGenerator.content({ paragraphs: 1, sentenceMin: 3, sentenceMax: 8 })}`,
            community_platform_post_id: post.id,
            status: "published",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);

    // Add small delay to ensure unique timestamps for sorting
    if (i < commentCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  // Step 4: Test search functionality with different pagination parameters

  // Test 1: Default pagination (page 1, default limit)
  const defaultPage =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page should return comments",
    defaultPage.data.length > 0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records should be at least comment count",
    defaultPage.pagination.records >= commentCount,
  );

  // Test 2: Custom limit per page
  const customLimit = 5;
  const limitedPage =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: customLimit,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(limitedPage);
  TestValidator.equals(
    "custom limit should be respected",
    limitedPage.data.length,
    customLimit,
  );
  TestValidator.equals(
    "pagination limit should match custom limit",
    limitedPage.pagination.limit,
    customLimit,
  );

  // Test 3: Multiple pages navigation
  const totalPages = Math.ceil(commentCount / customLimit);

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pageResult =
      await api.functional.communityPlatform.posts.comments.index(connection, {
        postId: post.id,
        body: {
          page: pageNum,
          limit: customLimit,
        } satisfies ICommunityPlatformComment.IRequest,
      });
    typia.assert(pageResult);
    TestValidator.equals(
      "current page should match requested page",
      pageResult.pagination.current,
      pageNum,
    );
    TestValidator.predicate(
      "page data should not exceed limit",
      pageResult.data.length <= customLimit,
    );
  }

  // Test 4: Sorting by creation date (newest first)
  const sortedByDate =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: commentCount,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedByDate);

  // Verify comments are sorted by creation date (newest first) using string comparison
  if (sortedByDate.data.length > 1) {
    for (let i = 0; i < sortedByDate.data.length - 1; i++) {
      TestValidator.predicate(
        "comments should be sorted by creation date (descending)",
        sortedByDate.data[i].created_at >= sortedByDate.data[i + 1].created_at,
      );
    }
  }

  // Test 5: Sorting by creation date (oldest first)
  const sortedByDateAsc =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: commentCount,
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedByDateAsc);

  // Verify comments are sorted by creation date (oldest first) using string comparison
  if (sortedByDateAsc.data.length > 1) {
    for (let i = 0; i < sortedByDateAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "comments should be sorted by creation date (ascending)",
        sortedByDateAsc.data[i].created_at <=
          sortedByDateAsc.data[i + 1].created_at,
      );
    }
  }

  // Test 6: Verify pagination metadata accuracy
  TestValidator.predicate(
    "total pages calculation should be accurate",
    defaultPage.pagination.pages >=
      Math.ceil(commentCount / defaultPage.pagination.limit),
  );
  TestValidator.equals(
    "total records should match created comments",
    defaultPage.pagination.records,
    commentCount,
  );

  // Test 7: Empty page beyond total pages
  const emptyPage = await api.functional.communityPlatform.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        page: totalPages + 10, // Page far beyond available data
        limit: customLimit,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "page beyond total pages should return empty data",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "current page should match requested page even when empty",
    emptyPage.pagination.current,
    totalPages + 10,
  );

  // Test 8: Verify comment content is preserved
  const allComments =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: commentCount * 2, // Get all comments
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(allComments);

  // Verify we can find our created comments in the results
  const foundComments = createdComments.filter((created) =>
    allComments.data.some((returned) => returned.id === created.id),
  );
  TestValidator.equals(
    "all created comments should be found in search results",
    foundComments.length,
    createdComments.length,
  );
}
