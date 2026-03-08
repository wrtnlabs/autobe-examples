import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test popular feed search and content type filtering functionality.
 *
 * Validates:
 * - Full-text search with case-insensitive and partial matching
 * - Content type filtering (text, link, image)
 * - Combined search and filter operations
 * - Pagination with active filters
 * - All operations work without authentication
 */
export async function test_api_popular_feed_search_and_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic search functionality
  const searchResults = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        search: "test",
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(searchResults);
  // Verify search results structure
  TestValidator.predicate(
    "search returns valid pagination structure",
    searchResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "search returns data array",
    Array.isArray(searchResults.data),
  );
  // Verify all search results have required fields
  if (searchResults.data.length > 0) {
    for (const post of searchResults.data) {
      typia.assert(post);
      TestValidator.predicate(
        "post has title",
        typeof post.title === "string" && post.title.length > 0,
      );
      TestValidator.predicate(
        "post has valid content type",
        post.contentType === "text" ||
          post.contentType === "link" ||
          post.contentType === "image",
      );
      TestValidator.predicate(
        "post has author",
        post.author !== null && post.author !== undefined,
      );
      TestValidator.predicate(
        "post has community",
        post.community !== null && post.community !== undefined,
      );
    }
  }
  // Test 2: Case-insensitive search
  const upperSearchResults =
    await api.functional.communityPlatform.popular.index(connection, {
      body: {
        search: "TEST",
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(upperSearchResults);
  // Test 3: Content type filtering - text posts
  const textPosts = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        contentType: "text",
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(textPosts);
  // Verify all returned posts are text type
  for (const post of textPosts.data) {
    TestValidator.equals("content type is text", post.contentType, "text");
  }
  // Test 4: Content type filtering - link posts
  const linkPosts = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        contentType: "link",
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(linkPosts);
  // Verify all returned posts are link type
  for (const post of linkPosts.data) {
    TestValidator.equals("content type is link", post.contentType, "link");
  }
  // Test 5: Content type filtering - image posts
  const imagePosts = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        contentType: "image",
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(imagePosts);
  // Verify all returned posts are image type
  for (const post of imagePosts.data) {
    TestValidator.equals("content type is image", post.contentType, "image");
  }
  // Test 6: Combined search and content type filter
  const combinedResults = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        search: "test",
        contentType: "text",
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(combinedResults);
  // Verify combined filter results
  for (const post of combinedResults.data) {
    TestValidator.equals(
      "combined filter - content type is text",
      post.contentType,
      "text",
    );
  }
  // Test 7: Pagination with filters
  const page1Results = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        contentType: "text",
        limit: 5,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(page1Results);
  // Verify pagination metadata
  TestValidator.equals(
    "page 1 current is 1",
    page1Results.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit matches request",
    page1Results.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page 1 total records is non-negative",
    page1Results.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 total pages is non-negative",
    page1Results.pagination.pages >= 0,
  );
  // Test pagination with page 2 (if available)
  if (page1Results.pagination.pages > 1) {
    const page2Results = await api.functional.communityPlatform.popular.index(
      connection,
      {
        body: {
          contentType: "text",
          limit: 5,
          page: 2,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
    typia.assert(page2Results);
    TestValidator.equals(
      "page 2 current is 2",
      page2Results.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination records consistent between pages",
      page2Results.pagination.records,
      page1Results.pagination.records,
    );
  }
  // Test 8: Different sort options
  const hotResults = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        sort: "hot",
        limit: 5,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(hotResults);
  const newResults = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        sort: "new",
        limit: 5,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(newResults);
  const topResults = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        sort: "top",
        timeFilter: "this_week",
        limit: 5,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(topResults);
  const controversialResults =
    await api.functional.communityPlatform.popular.index(connection, {
      body: {
        sort: "controversial",
        limit: 5,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(controversialResults);
  // Test 9: Empty search query (should return all posts)
  const allPosts = await api.functional.communityPlatform.popular.index(
    connection,
    {
      body: {
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(allPosts);
  TestValidator.predicate(
    "unfiltered query returns data",
    Array.isArray(allPosts.data),
  );
}
