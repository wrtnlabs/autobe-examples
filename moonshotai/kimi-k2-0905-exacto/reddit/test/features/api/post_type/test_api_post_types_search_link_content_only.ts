import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostType";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test filtering post types optimized for link sharing. Validates the system
 * can identify post types that permit external URLs without requiring text
 * bodies or media attachments. Important for communities focused on link
 * aggregation and sharing.
 */
export async function test_api_post_types_search_link_content_only(
  connection: api.IConnection,
) {
  // Test 1: Search for post types that allow links and exclude text/media requirements
  const linkOnlyPostTypes =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: {
        allows_links: true,
        allows_text_content: false,
        requires_media: false,
        page: 1,
        limit: 20,
        order_by: "name",
        order_direction: "asc",
      } satisfies IRedditCommunityPostType.IRequest,
    });
  typia.assert(linkOnlyPostTypes);

  // Validate that all returned post types match the filtering criteria
  TestValidator.predicate(
    "all returned post types allow links",
    linkOnlyPostTypes.data.every((type) => type.allows_links === true),
  );

  TestValidator.predicate(
    "all returned post types do not require text content",
    linkOnlyPostTypes.data.every((type) => type.allows_text_content === false),
  );

  TestValidator.predicate(
    "all returned post types do not require media",
    linkOnlyPostTypes.data.every((type) => type.requires_media === false),
  );

  // Validate pagination
  TestValidator.predicate(
    "pagination is valid",
    linkOnlyPostTypes.pagination.current >= 1 &&
      linkOnlyPostTypes.pagination.limit >= 1 &&
      linkOnlyPostTypes.pagination.limit <= 100,
  );

  // Validate strict property types for all returned post types
  linkOnlyPostTypes.data.forEach((postType) => {
    typia.assert<IRedditCommunityPostType.ISummary>(postType);

    if (!typia.is<string & tags.Format<"uuid">>(postType.id)) {
      throw new Error(`Post type has invalid UUID format id: ${postType.id}`);
    }

    if (postType.name.length === 0) {
      throw new Error(`Post type has empty name`);
    }

    if (typeof postType.allows_links !== "boolean") {
      throw new Error(
        `Post type allows_links is not boolean: ${typeof postType.allows_links}`,
      );
    }

    if (typeof postType.allows_text_content !== "boolean") {
      throw new Error(
        `Post type allows_text_content is not boolean: ${typeof postType.allows_text_content}`,
      );
    }

    if (typeof postType.requires_media !== "boolean") {
      throw new Error(
        `Post type requires_media is not boolean: ${typeof postType.requires_media}`,
      );
    }
  });

  // Test 2: Search with different pagination parameters
  const paginatedResults = await api.functional.redditCommunity.postTypes.index(
    connection,
    {
      body: {
        allows_links: true,
        allows_text_content: false,
        requires_media: false,
        page: 2,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IRedditCommunityPostType.IRequest,
    },
  );
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "paginated results maintain filtering criteria",
    paginatedResults.data.every(
      (type) =>
        type.allows_links === true &&
        type.allows_text_content === false &&
        type.requires_media === false,
    ),
  );

  // Test 3: Search with text validation to ensure link-only types are returned
  const textSearchResults =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: {
        search: RandomGenerator.pick(["link", "url", "external"]),
        allows_links: true,
        allows_text_content: false,
        requires_media: false,
        page: 1,
        limit: 15,
      } satisfies IRedditCommunityPostType.IRequest,
    });
  typia.assert(textSearchResults);

  TestValidator.predicate(
    "text search returns link-only post types",
    textSearchResults.data.length === 0 ||
      textSearchResults.data.every(
        (type) =>
          type.allows_links === true && type.allows_text_content === false,
      ),
  );

  // Test 4: Validate empty results handling
  const strictFilterResults =
    await api.functional.redditCommunity.postTypes.index(connection, {
      body: {
        allows_links: true,
        allows_text_content: false,
        requires_media: false,
        search: "nonexistent_type_name_xyz123",
        page: 1,
        limit: 5,
      } satisfies IRedditCommunityPostType.IRequest,
    });
  typia.assert(strictFilterResults);

  TestValidator.predicate(
    "no results for non-matching search term",
    strictFilterResults.data.length === 0,
  );

  TestValidator.predicate(
    "pagination shows zero records for empty results",
    strictFilterResults.pagination.records === 0,
  );
}
