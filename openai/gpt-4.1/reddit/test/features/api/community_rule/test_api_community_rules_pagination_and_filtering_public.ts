import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";

/**
 * Test public fetching of paginated and filtered community rules, validating
 * pagination, sorting, search, and enforcement filters for unauthenticated
 * users.
 *
 * Ensures that only non-hidden, enforced rules are visible through the public
 * endpoint, and tests that optional parameters (page, limit, sort, search,
 * enforced) can be safely omitted or combined with logical results. Also
 * verifies that sorting/order/query options function as intended and that the
 * response has correct page structure.
 */
export async function test_api_community_rules_pagination_and_filtering_public(
  connection: api.IConnection,
) {
  // Generate a random (likely public) community name for context
  const communityName = RandomGenerator.alphaNumeric(10);

  // -- 1. Basic fetch (no filters, default pagination) --
  const outputDefault =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityName,
      body: {} satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(outputDefault);
  TestValidator.predicate(
    "all rules are enforced in public fetch (default)",
    outputDefault.data.every((rule) => rule.enforced === true),
  );

  // -- 2. Pagination explicit --
  const outputPaginated =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityName,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(outputPaginated);
  TestValidator.equals(
    "pagination limit is respected",
    outputPaginated.data.length <= 5,
    true,
  );

  // -- 3. Sorting explicit --
  const outputSorted =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityName,
      body: {
        sort_by: "display_order",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(outputSorted);
  TestValidator.predicate(
    "rules are sorted by display_order ascending",
    outputSorted.data.every(
      (rule, idx, arr) =>
        idx === 0 || rule.display_order >= arr[idx - 1].display_order,
    ),
  );

  // -- 4. Search filter (partial match in description) --
  let searchTerm = undefined;
  if (outputDefault.data.length > 0) {
    // Use a substring from a real rule's description for search
    searchTerm = RandomGenerator.substring(outputDefault.data[0].description);
    // Non-empty, real keyword
    if (searchTerm.length < 2)
      searchTerm = outputDefault.data[0].description.slice(0, 2);
  } else {
    // Fallback: random string
    searchTerm = RandomGenerator.alphaNumeric(4);
  }
  const outputSearch =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityName,
      body: {
        search: searchTerm,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(outputSearch);
  TestValidator.predicate(
    "search filter returns rules containing the keyword",
    outputSearch.data.every(
      (rule) =>
        rule.description.includes(searchTerm!) ||
        rule.code.includes(searchTerm!),
    ),
  );

  // -- 5. Enforced=false filter returns nothing (public) --
  const outputNoEnforced =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityName,
      body: {
        enforced: false,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(outputNoEnforced);
  TestValidator.equals(
    "no unenforced rules returned for public request",
    outputNoEnforced.data.length,
    0,
  );

  // -- 6. Combine filters (page 1, limit 2, enforced=true, search, sort desc) --
  const outputCombined =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityName,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        enforced: true,
        search: searchTerm,
        sort_by: "display_order",
        order: "desc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(outputCombined);
  TestValidator.predicate(
    "combined params yield only enforced rules containing keyword and sorted by display_order desc",
    outputCombined.data.every(
      (rule, idx, arr) =>
        rule.enforced === true &&
        (rule.description.includes(searchTerm!) ||
          rule.code.includes(searchTerm!)) &&
        (idx === 0 || rule.display_order <= arr[idx - 1].display_order),
    ),
  );

  // -- 7. Omitted parameters permitted --
  const outputOmitted =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityName,
      body: {} satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(outputOmitted);
  TestValidator.predicate(
    "omitted parameters yield enforced rules with default paging",
    outputOmitted.data.every((rule) => rule.enforced === true),
  );

  // -- 8. Edge: search for nonexistent keyword yields empty data --
  const outputNotFound =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityName,
      body: {
        search: "__nonexistent__keyword__",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(outputNotFound);
  TestValidator.equals(
    "search with nonexistent keyword returns no data",
    outputNotFound.data.length,
    0,
  );

  // -- 9. Edge: large out-of-range page returns no data --
  const outputOutOfRange =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityName,
      body: {
        page: 9999 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(outputOutOfRange);
  TestValidator.equals(
    "large page returns no data",
    outputOutOfRange.data.length,
    0,
  );
}
