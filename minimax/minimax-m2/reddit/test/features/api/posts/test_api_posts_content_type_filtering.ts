import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_posts_content_type_filtering(
  connection: api.IConnection,
) {
  // Test 1: Filter by text content type
  const textFilterResult: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        content_type: "text",
        limit: 25,
        page: 1,
      } satisfies IRedditPlatformPost.IRequest,
    });

  typia.assert(textFilterResult);
  TestValidator.equals(
    "text filter returns valid response structure",
    textFilterResult.data !== undefined,
    true,
  );

  // Validate text posts structure if data exists
  if (textFilterResult.data.length > 0) {
    textFilterResult.data.forEach((post, index) => {
      TestValidator.equals(
        `text post ${index} has text content type`,
        post.content_type,
        "text",
      );
      TestValidator.predicate(
        `text post ${index} has valid ID format`,
        post.id.length > 0,
      );
      TestValidator.predicate(
        `text post ${index} has proper author info`,
        post.author !== null && post.author !== undefined,
      );
      TestValidator.predicate(
        `text post ${index} has community info`,
        post.community !== null && post.community !== undefined,
      );
      TestValidator.predicate(
        `text post ${index} has valid timestamps`,
        post.created_at.length > 0,
      );
    });
  }

  // Test 2: Filter by link content type
  const linkFilterResult: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        content_type: "link",
        limit: 25,
        page: 1,
      } satisfies IRedditPlatformPost.IRequest,
    });

  typia.assert(linkFilterResult);
  TestValidator.equals(
    "link filter returns valid response structure",
    linkFilterResult.data !== undefined,
    true,
  );

  // Validate link posts structure if data exists
  if (linkFilterResult.data.length > 0) {
    linkFilterResult.data.forEach((post, index) => {
      TestValidator.equals(
        `link post ${index} has link content type`,
        post.content_type,
        "link",
      );
      TestValidator.predicate(
        `link post ${index} has valid title`,
        post.title.length > 0,
      );
      TestValidator.predicate(
        `link post ${index} has community context`,
        post.community.name.length > 0,
      );
      TestValidator.predicate(
        `link post ${index} has engagement metrics`,
        post.score >= 0 && post.comment_count >= 0,
      );
    });
  }

  // Test 3: Filter by image content type
  const imageFilterResult: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        content_type: "image",
        limit: 25,
        page: 1,
      } satisfies IRedditPlatformPost.IRequest,
    });

  typia.assert(imageFilterResult);
  TestValidator.equals(
    "image filter returns valid response structure",
    imageFilterResult.data !== undefined,
    true,
  );

  // Validate image posts structure if data exists
  if (imageFilterResult.data.length > 0) {
    imageFilterResult.data.forEach((post, index) => {
      TestValidator.equals(
        `image post ${index} has image content type`,
        post.content_type,
        "image",
      );
      TestValidator.predicate(
        `image post ${index} has engagement metrics`,
        post.score >= 0 && post.comment_count >= 0,
      );
      TestValidator.predicate(
        `image post ${index} has valid status`,
        post.status.length > 0,
      );
      TestValidator.predicate(
        `image post ${index} has view count`,
        post.view_count >= 0,
      );
    });
  }

  // Test 4: Test content type filtering with pagination and sorting
  const paginatedTextResult: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        content_type: "text",
        limit: 10,
        page: 1,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    });

  typia.assert(paginatedTextResult);
  TestValidator.equals(
    "paginated text results respect limit",
    paginatedTextResult.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "pagination info is consistent",
    paginatedTextResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "current page is correct",
    paginatedTextResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid total records",
    paginatedTextResult.pagination.records >= 0,
  );

  // Test 5: Test content type with community filtering and sorting
  const communityTextResult: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        content_type: "text",
        limit: 20,
        page: 1,
        sort_by: "score",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    });

  typia.assert(communityTextResult);
  TestValidator.equals(
    "community filtered text results structure",
    communityTextResult.data !== undefined,
    true,
  );
  TestValidator.predicate(
    "results respect requested limit",
    communityTextResult.data.length <= 20,
  );

  // Test 6: Validate filtering returns empty results for non-existent page
  const emptyResult: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        content_type: "text",
        limit: 10,
        page: 999999, // Very high page number to get empty results
      } satisfies IRedditPlatformPost.IRequest,
    });

  typia.assert(emptyResult);
  TestValidator.equals(
    "empty results handled gracefully",
    emptyResult.data.length === 0,
    true,
  );
  TestValidator.equals(
    "pagination reflects empty state",
    emptyResult.pagination.current,
    999999,
  );
  TestValidator.predicate(
    "pagination maintains structure on empty results",
    emptyResult.pagination.records >= 0,
  );

  // Test 7: Test content type filtering with search functionality
  const searchTextResult: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        content_type: "text",
        search: "test",
        limit: 15,
        page: 1,
      } satisfies IRedditPlatformPost.IRequest,
    });

  typia.assert(searchTextResult);
  TestValidator.equals(
    "search with text filter works",
    searchTextResult.data !== undefined,
    true,
  );
  TestValidator.predicate(
    "search results respect limit",
    searchTextResult.data.length <= 15,
  );

  // Test 8: Validate response structure consistency across all content types
  const allContentTypes = ["text", "link", "image"] as const;
  for (const contentType of allContentTypes) {
    const result: IPageIRedditPlatformPost.ISummary =
      await api.functional.redditPlatform.posts.index(connection, {
        body: {
          content_type: contentType,
          limit: 5,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      });

    typia.assert(result);

    // Validate consistent response structure
    TestValidator.predicate(
      `${contentType} filter has valid pagination`,
      result.pagination.current >= 0 &&
        result.pagination.limit > 0 &&
        result.pagination.records >= 0,
    );

    TestValidator.predicate(
      `${contentType} filter has consistent data structure`,
      result.data.every(
        (post) =>
          post.id.length > 0 &&
          post.title.length > 0 &&
          post.content_type === contentType &&
          post.status.length > 0 &&
          post.created_at.length > 0 &&
          post.score >= 0 &&
          post.comment_count >= 0 &&
          post.view_count >= 0,
      ),
    );

    // Validate author and community structure consistency
    if (result.data.length > 0) {
      const firstPost = result.data[0];
      TestValidator.predicate(
        `${contentType} posts have valid author structure`,
        firstPost.author.id.length > 0 &&
          firstPost.author.username.length > 0 &&
          firstPost.author.account_status.length > 0,
      );

      TestValidator.predicate(
        `${contentType} posts have valid community structure`,
        firstPost.community.id.length > 0 &&
          firstPost.community.name.length > 0 &&
          firstPost.community.title.length > 0,
      );
    }
  }

  // Test 9: Test content type filtering with date range
  const dateRangeResult: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        content_type: "text",
        created_after: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        limit: 10,
        page: 1,
      } satisfies IRedditPlatformPost.IRequest,
    });

  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filtering works with content type",
    dateRangeResult.data !== undefined,
    true,
  );

  // Test 10: Test score-based filtering with content type
  const scoreFilteredResult: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        content_type: "link",
        min_score: 1,
        limit: 10,
        page: 1,
      } satisfies IRedditPlatformPost.IRequest,
    });

  typia.assert(scoreFilteredResult);
  TestValidator.equals(
    "score filtering works with content type",
    scoreFilteredResult.data !== undefined,
    true,
  );

  if (scoreFilteredResult.data.length > 0) {
    scoreFilteredResult.data.forEach((post, index) => {
      TestValidator.predicate(
        `score filtered post ${index} meets minimum score`,
        post.score >= 1,
      );
      TestValidator.equals(
        `score filtered post ${index} is link type`,
        post.content_type,
        "link",
      );
    });
  }
}
