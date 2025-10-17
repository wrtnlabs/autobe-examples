import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumTag";

export async function test_api_tag_search_public_listing(
  connection: api.IConnection,
) {
  /**
   * Purpose: Test the public tag search/listing endpoint (PATCH
   * /econPoliticalForum/tags)
   *
   * - Verify successful paginated listing for public requests
   * - Validate pagination metadata shape and basic numeric sanity
   * - Verify returned tag summaries (id, name, slug) are present and sensible
   * - Confirm default ordering by name ascending when no sort is provided
   * - Validate behavior when requesting an empty page (large page number)
   *
   * Notes:
   *
   * - Uses only public access (no authentication)
   * - Uses IEconPoliticalForumTag.IRequest for request bodies via `satisfies`
   * - Uses typia.assert() to validate response shapes
   */

  // 1) Basic listing request (page 1, limit 20) — public listing
  const listRequest = {
    page: 1,
    limit: 20,
  } satisfies IEconPoliticalForumTag.IRequest;

  const pageResult: IPageIEconPoliticalForumTag.ISummary =
    await api.functional.econPoliticalForum.tags.index(connection, {
      body: listRequest,
    });
  // Response shape validation
  typia.assert(pageResult);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "pagination fields are non-negative numbers",
    pageResult.pagination.current >= 0 &&
      pageResult.pagination.limit >= 0 &&
      pageResult.pagination.records >= 0 &&
      pageResult.pagination.pages >= 0,
  );

  // Data array length should not exceed requested limit
  TestValidator.predicate(
    "data length does not exceed requested limit",
    pageResult.data.length <= listRequest.limit,
  );

  // Each item must have non-empty name and slug (business-level checks)
  TestValidator.predicate(
    "each returned tag has non-empty name and slug",
    pageResult.data.every(
      (t) =>
        typeof t.name === "string" &&
        t.name.length > 0 &&
        typeof t.slug === "string" &&
        t.slug.length > 0,
    ),
  );

  // Default ordering: name ascending when no sort provided
  const names = pageResult.data.map((t) => t.name);
  const namesSorted = [...names].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "default ordering is name ascending",
    names,
    namesSorted,
  );

  // 2) Edge case: request a very large page to simulate empty result set
  const emptyPageRequest = {
    page: 999999,
    limit: 20,
  } satisfies IEconPoliticalForumTag.IRequest;
  const emptyPage: IPageIEconPoliticalForumTag.ISummary =
    await api.functional.econPoliticalForum.tags.index(connection, {
      body: emptyPageRequest,
    });
  typia.assert(emptyPage);

  // When beyond available pages, server should return an empty data array (no error)
  TestValidator.equals(
    "large page returns empty data array",
    emptyPage.data,
    [],
  );
}
