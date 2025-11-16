import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostType";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test filtering post types that support text content exclusively.
 *
 * This test validates the filtering logic for posts that allow text bodies
 * without requiring media files or supporting external links. It ensures the
 * system correctly identifies text-only post types for community
 * configuration.
 *
 * The test will:
 *
 * 1. Create a search request filtering for text-only post types
 * 2. Verify that only post types with text content support are returned
 * 3. Ensure no post types requiring media or allowing links are included
 * 4. Validate pagination and response structure
 */
export async function test_api_post_types_search_text_content_only(
  connection: api.IConnection,
) {
  // Create search parameters for text-only post types
  const searchParams = {
    allows_text_content: true,
    allows_links: false,
    requires_media: false,
    page: 1,
    limit: 50,
    order_by: "name" as const,
    order_direction: "asc" as const,
  } satisfies IRedditCommunityPostType.IRequest;

  // Call the API to search for text-only post types
  const response = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: searchParams,
    },
  );

  // Validate the response structure
  typia.assert(response);

  // Verify pagination information
  TestValidator.predicate(
    "pagination current page should be 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    response.pagination.limit === 50,
  );

  // Validate that all returned post types meet text-only criteria
  TestValidator.predicate(
    "all post types should allow text content",
    response.data.every((postType) => postType.allows_text_content === true),
  );

  TestValidator.predicate(
    "no post types should allow links",
    response.data.every((postType) => postType.allows_links === false),
  );

  TestValidator.predicate(
    "no post types should require media",
    response.data.every((postType) => postType.requires_media === false),
  );

  // Validate that post types have required fields
  TestValidator.predicate(
    "all post types should have valid UUIDs",
    response.data.every(
      (postType) =>
        typeof postType.id === "string" &&
        postType.id.length > 0 &&
        typeof postType.name === "string" &&
        postType.name.length > 0,
    ),
  );
}
