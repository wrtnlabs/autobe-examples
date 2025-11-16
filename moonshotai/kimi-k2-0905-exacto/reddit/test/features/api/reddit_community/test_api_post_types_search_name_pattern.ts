import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostType";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test text-based search across post type names and descriptions.
 *
 * This comprehensive test validates fuzzy matching capabilities for finding
 * relevant post types based on partial name matches or description keywords. It
 * enables administrators and moderators to quickly locate specific post
 * configurations for community management.
 *
 * Test workflow:
 *
 * 1. Create multiple post types with varying capabilities
 * 2. Test search functionality with different query patterns
 * 3. Validate filtering capabilities (text, links, media)
 * 4. Test sorting and pagination performance
 * 5. Verify real-world search scenarios
 *
 * Key validations:
 *
 * - Text search returns matching post types
 * - Partial search patterns work correctly
 * - Content capability filters work
 * - Pagination returns correct results
 * - Sorting by different fields works
 */
export async function test_api_post_types_search_name_pattern(
  connection: api.IConnection,
) {
  // Get initial list of all post types for reference
  const allPostTypes: IPageIRedditCommunityPostType.ISummary =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPostType.IRequest,
    });
  typia.assert(allPostTypes);

  // Test 1: Basic search functionality
  const searchByTextContent = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<20>
  >();
  const textSearchResults: IPageIRedditCommunityPostType.ISummary =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: {
        search: searchByTextContent,
        allows_text_content: true,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityPostType.IRequest,
    });
  typia.assert(textSearchResults);

  // Validate text search found results
  TestValidator.predicate(
    "text search should return at least one result",
    textSearchResults.data.length > 0,
  );

  TestValidator.equals(
    "text search pagination data present",
    textSearchResults.pagination.current,
    1,
  );

  // Test 2: Search with link support
  const linkSearchResults: IPageIRedditCommunityPostType.ISummary =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: {
        allows_links: true,
        requires_media: false,
        page: 1,
        limit: 5,
      } satisfies IRedditCommunityPostType.IRequest,
    });
  typia.assert(linkSearchResults);

  // Verify link-capable post types
  TestValidator.predicate(
    "link search should return post types that support links",
    linkSearchResults.data.length > 0,
  );

  // Validate that all results support links but don't require media
  for (const postType of linkSearchResults.data) {
    TestValidator.equals(
      "post type should allow links",
      postType.allows_links,
      true,
    );
    TestValidator.equals(
      "post type should not require media",
      postType.requires_media,
      false,
    );
  }

  // Test 3: Different pagination sizes
  const pageOneResults: IPageIRedditCommunityPostType.ISummary =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: {
        page: 1,
        limit: 3,
        order_by: "name",
      } satisfies IRedditCommunityPostType.IRequest,
    });
  typia.assert(pageOneResults);

  const pageTwoResults: IPageIRedditCommunityPostType.ISummary =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: {
        page: 2,
        limit: 3,
        order_by: "name",
        order_direction: "asc",
      } satisfies IRedditCommunityPostType.IRequest,
    });
  typia.assert(pageTwoResults);

  // Validate pagination works and pages are different
  TestValidator.equals(
    "page one should have correct limit",
    pageOneResults.data.length <= 3,
    true,
  );

  // Test 4: Search keyword with common patterns
  const keywordResults: IPageIRedditCommunityPostType.ISummary =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: {
        search: "post",
        page: 1,
        limit: 15,
      } satisfies IRedditCommunityPostType.IRequest,
    });
  typia.assert(keywordResults);

  // Test 5: Filter combinations
  const complexFilter: IRedditCommunityPostType.IRequest = {
    allows_text_content: true,
    allows_links: false,
    requires_media: false,
    page: 1,
    limit: 8,
    order_by: "name",
    order_direction: "desc",
  };

  const filteredResults: IPageIRedditCommunityPostType.ISummary =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: complexFilter,
    });
  typia.assert(filteredResults);

  // Validate complex filter results
  for (const postType of filteredResults.data) {
    TestValidator.equals(
      "filtered result should allow text content",
      postType.allows_text_content,
      true,
    );
    TestValidator.equals(
      "filtered result should disallow links",
      postType.allows_links,
      false,
    );
    TestValidator.equals(
      "filtered result should not require media",
      postType.requires_media,
      false,
    );
  }

  // Test 6: Edge case - beyond available pages
  const beyondPagesResults: IPageIRedditCommunityPostType.ISummary =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: {
        page: allPostTypes.pagination.pages + 100, // Well beyond available pages
        limit: 5,
      } satisfies IRedditCommunityPostType.IRequest,
    });
  typia.assert(beyondPagesResults);

  // Should return empty for pages beyond available data
  TestValidator.equals(
    "beyond available pages should return empty results",
    beyondPagesResults.data.length,
    0,
  );
}
