import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostType";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test comprehensive post type discovery with advanced filtering capabilities.
 * Users can search for post types based on content capabilities (text, links,
 * media), sort by name or creation date, and navigate through paginated
 * results. Validates that search functionality returns appropriate post types
 * based on filter criteria and maintains consistent pagination behavior.
 */
export async function test_api_post_types_search_with_filters(
  connection: api.IConnection,
) {
  // Test basic search without filters
  const basicSearchRequest = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityPostType.IRequest;

  const basicResult = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: basicSearchRequest,
    },
  );
  typia.assert(basicResult);

  TestValidator.predicate(
    "basic search should return paginated results",
    basicResult.pagination !== undefined &&
      basicResult.data !== undefined &&
      Array.isArray(basicResult.data) &&
      basicResult.pagination.limit === basicSearchRequest.limit,
  );

  // Test text content capability filtering
  const textContentFilter = {
    page: 1,
    allows_text_content: true,
    limit: 10,
  } satisfies IRedditCommunityPostType.IRequest;

  const textContentResult =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: textContentFilter,
    });
  typia.assert(textContentResult);

  TestValidator.predicate(
    "text content filter should return only text-enabled post types",
    textContentResult.data.every(
      (postType) => postType.allows_text_content === true,
    ),
  );

  // Test link support capability filtering
  const linkFilter = {
    page: 1,
    allows_links: true,
    limit: 10,
  } satisfies IRedditCommunityPostType.IRequest;

  const linkResult = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: linkFilter,
    },
  );
  typia.assert(linkResult);

  TestValidator.predicate(
    "link filter should return only link-enabled post types",
    linkResult.data.every((postType) => postType.allows_links === true),
  );

  // Test media requirement filtering
  const mediaRequiredFilter = {
    page: 1,
    requires_media: true,
    limit: 10,
  } satisfies IRedditCommunityPostType.IRequest;

  const mediaRequiredResult =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: mediaRequiredFilter,
    });
  typia.assert(mediaRequiredResult);

  TestValidator.predicate(
    "media required filter should return only media-requiring post types",
    mediaRequiredResult.data.every(
      (postType) => postType.requires_media === true,
    ),
  );

  // Test combined filters
  const combinedFilter = {
    page: 1,
    allows_text_content: true,
    allows_links: true,
    requires_media: false,
    limit: 10,
  } satisfies IRedditCommunityPostType.IRequest;

  const combinedResult = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: combinedFilter,
    },
  );
  typia.assert(combinedResult);

  TestValidator.predicate(
    "combined filters should return post types matching all criteria",
    combinedResult.data.every(
      (postType) =>
        postType.allows_text_content === true &&
        postType.allows_links === true &&
        postType.requires_media === false,
    ),
  );

  // Test sorting by name
  const sortByNameRequest = {
    page: 1,
    order_by: "name",
    order_direction: "asc",
    limit: 10,
  } as const satisfies IRedditCommunityPostType.IRequest;

  const sortByNameResult = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: sortByNameRequest,
    },
  );
  typia.assert(sortByNameResult);

  // Verify sorting order
  const sortedNamesAsc = [...sortByNameResult.data].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  TestValidator.equals(
    "ascending name sort should maintain correct order",
    sortByNameResult.data.map((t) => t.name),
    sortedNamesAsc.map((t) => t.name),
  );

  // Test descending sort
  const sortByNameDesc = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: {
        ...sortByNameRequest,
        order_direction: "desc" as const,
      },
    },
  );
  typia.assert(sortByNameDesc);

  TestValidator.predicate(
    "descending name sort should maintain correct order",
    sortByNameDesc.data.every(
      (postType, index) =>
        index === 0 ||
        postType.name.localeCompare(sortByNameDesc.data[index - 1].name) <= 0,
    ),
  );

  // Test pagination behavior
  const paginatedRequest = {
    page: 2,
    limit: 5,
  } satisfies IRedditCommunityPostType.IRequest;

  const paginatedResult = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: paginatedRequest,
    },
  );
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "pagination should work correctly",
    paginatedResult.pagination.current === 2 &&
      paginatedResult.pagination.limit === 5 &&
      paginatedResult.data.length <= 5,
  );

  // Test search text filtering
  const searchText = "text";
  const searchTextFilter = {
    page: 1,
    search: searchText,
    allows_text_content: true,
  } satisfies IRedditCommunityPostType.IRequest;

  const searchTextResult = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: searchTextFilter,
    },
  );
  typia.assert(searchTextResult);

  TestValidator.predicate(
    "search text should filter post types by name",
    searchTextResult.data.every(
      (postType) =>
        postType.name.toLowerCase().includes(searchText.toLowerCase()) &&
        postType.allows_text_content,
    ),
  );

  // Test empty result case with impossible filter combination
  const impossibleFilter = {
    page: 1,
    allows_text_content: true,
    requires_media: true,
    search: "nonexistentposttype",
  } satisfies IRedditCommunityPostType.IRequest;

  const emptyResult = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: impossibleFilter,
    },
  );
  typia.assert(emptyResult);

  TestValidator.predicate(
    "impossible filter should return empty results or minimal results",
    emptyResult.data.length === 0 || emptyResult.pagination.records === 0,
  );

  // Test edge cases
  const emptyFiltersRequest = {} satisfies IRedditCommunityPostType.IRequest;

  const emptyFiltersResult =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: emptyFiltersRequest,
    });
  typia.assert(emptyFiltersResult);

  TestValidator.predicate(
    "empty filters should return all post types",
    emptyFiltersResult.data.length > 0 &&
      emptyFiltersResult.pagination.records >= 0,
  );

  // Test boundary pagination values
  const maxLimitRequest = {
    page: 1,
    limit: 100,
  } satisfies IRedditCommunityPostType.IRequest;

  const maxLimitResult = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: maxLimitRequest,
    },
  );
  typia.assert(maxLimitResult);

  TestValidator.predicate(
    "maximum limit should return up to 100 results",
    maxLimitResult.data.length <= 100 &&
      maxLimitResult.pagination.limit === 100,
  );

  // Test all available post type combinations
  const allPostTypes = [
    { allows_text_content: true, allows_links: false, requires_media: false },
    { allows_text_content: false, allows_links: true, requires_media: false },
    { allows_text_content: false, allows_links: false, requires_media: true },
    { allows_text_content: true, allows_links: true, requires_media: false },
    { allows_text_content: true, allows_links: false, requires_media: true },
    { allows_text_content: false, allows_links: true, requires_media: true },
    { allows_text_content: true, allows_links: true, requires_media: true },
  ];

  TestValidator.predicate(
    "all post type combinations should be testable",
    allPostTypes.length > 0,
  );

  // Verify that we can test each combination
  for (const postType of allPostTypes) {
    const singleTypeRequest = {
      page: 1,
      allows_text_content: postType.allows_text_content,
      allows_links: postType.allows_links,
      requires_media: postType.requires_media,
      limit: 10,
    } satisfies IRedditCommunityPostType.IRequest;

    const singleTypeResult =
      await api.functional.redditCommunity.postTypes.index(connection, {
        body: singleTypeRequest,
      });
    typia.assert(singleTypeResult);

    TestValidator.predicate(
      `post type combination ${JSON.stringify(postType)} should return only matching types`,
      singleTypeResult.data.every(
        (resultType) =>
          resultType.allows_text_content === postType.allows_text_content &&
          resultType.allows_links === postType.allows_links &&
          resultType.requires_media === postType.requires_media,
      ) || singleTypeResult.data.length === 0,
    );
  }
}
