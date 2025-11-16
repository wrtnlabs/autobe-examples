import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostType";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test locating post types that mandate media content.
 *
 * Validates identification of image/video-centric post types where media files
 * are compulsory for submission. Essential for communities built around visual
 * content sharing. This test ensures that the filtering system correctly
 * identifies and returns only post types that require media files, supporting
 * content creators who need visual-first posting formats.
 *
 * The test validates:
 *
 * 1. Filtering by media requirement returns media-mandatory post types
 * 2. Pagination works correctly with filtered results
 * 3. Search functionality integrates with media filtering
 * 4. Response data integrity for media-specific post types
 * 5. Business logic for visual-content-focused communities
 */
export async function test_api_post_types_media_required_filtering(
  connection: api.IConnection,
) {
  // 1. Test filtering for post types that require media
  const mediaRequiredRequest = {
    requires_media: true,
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityPostType.IRequest;

  const mediaRequiredResponse =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: mediaRequiredRequest,
    });

  typia.assert(mediaRequiredResponse);

  // 2. Validate filtered results - all returned post types should require media
  TestValidator.predicate(
    "media required filter returns only media-mandatory post types",
    mediaRequiredResponse.data.every(
      (postType) => postType.requires_media === true,
    ),
  );

  // 3. Validate pagination metadata exists
  TestValidator.predicate(
    "pagination metadata exists for filtered results",
    mediaRequiredResponse.pagination !== undefined &&
      typeof mediaRequiredResponse.pagination.current === "number" &&
      typeof mediaRequiredResponse.pagination.limit === "number",
  );

  // 4. Test search integration with media filtering
  const searchWithMediaRequest = {
    requires_media: true,
    search: "image",
    page: 1,
    limit: 5,
  } satisfies IRedditCommunityPostType.IRequest;

  const searchResponse = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: searchWithMediaRequest,
    },
  );

  typia.assert(searchResponse);

  // 5. Verify search results still only contain media-required types
  TestValidator.predicate(
    "search with media filter returns only media-mandatory post types",
    searchResponse.data.every((postType) => postType.requires_media === true),
  );

  // 6. Test mixed filtering scenarios with media requirement
  const mixedFilterRequest = {
    requires_media: true,
    allows_text_content: true,
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityPostType.IRequest;

  const mixedFilterResponse =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: mixedFilterRequest,
    });

  typia.assert(mixedFilterResponse);

  TestValidator.predicate(
    "mixed filtering returns correct combinations",
    mixedFilterResponse.data.every(
      (postType) =>
        postType.requires_media === true &&
        postType.allows_text_content === true,
    ),
  );

  // 7. Test filtering for post types that do NOT require media (inverse validation)
  const noMediaRequiredRequest = {
    requires_media: false,
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityPostType.IRequest;

  const noMediaResponse = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: noMediaRequiredRequest,
    },
  );

  typia.assert(noMediaResponse);

  TestValidator.predicate(
    "non-media filter returns post types that don't require media",
    noMediaResponse.data.every((postType) => postType.requires_media === false),
  );

  // 8. Validate response data structure and field integrity
  TestValidator.predicate(
    "all response post types have required summary fields",
    mediaRequiredResponse.data.every(
      (postType) =>
        typeof postType.id === "string" &&
        typia.is<string & tags.Format<"uuid">>(postType.id) &&
        typeof postType.name === "string" &&
        typeof postType.requires_media === "boolean" &&
        typeof postType.allows_text_content === "boolean" &&
        typeof postType.allows_links === "boolean",
    ),
  );

  // 9. Test pagination bounds for filtered media results
  const largePageRequest = {
    requires_media: true,
    page: 999,
    limit: 100,
  } satisfies IRedditCommunityPostType.IRequest;

  const largePageResponse =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: largePageRequest,
    });

  typia.assert(largePageResponse);

  // Validate that pagination handles large page numbers gracefully
  TestValidator.predicate(
    "pagination handles large page numbers correctly",
    largePageResponse.pagination.records !== undefined &&
      largePageResponse.pagination.pages !== undefined,
  );

  // 10. Test complete integration with all filtering parameters
  const comprehensiveFilterRequest = {
    requires_media: true,
    allows_text_content: true,
    allows_links: false,
    search: "visual",
    order_by: "name", // from enum validation
    order_direction: "asc", // from enum validation
    page: 1,
    limit: 50,
  } satisfies IRedditCommunityPostType.IRequest;

  const comprehensiveResponse =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: comprehensiveFilterRequest,
    });

  typia.assert(comprehensiveResponse);

  // Validate all filter combinations work together
  TestValidator.predicate(
    "comprehensive filtering returns correct post type combinations",
    comprehensiveResponse.data.every(
      (postType) =>
        postType.requires_media === true &&
        postType.allows_text_content === true &&
        postType.allows_links === false,
    ),
  );

  TestValidator.equals(
    "comprehensive filter respects page limit",
    comprehensiveResponse.data.length,
    Math.min(50, comprehensiveResponse.pagination.records),
  );

  // 11. Ensure data integrity across all response structures
  typia.assert(mediaRequiredResponse);
  typia.assert(searchResponse);
  typia.assert(mixedFilterResponse);
  typia.assert(noMediaResponse);
  typia.assert(largePageResponse);
  typia.assert(comprehensiveResponse);
}
