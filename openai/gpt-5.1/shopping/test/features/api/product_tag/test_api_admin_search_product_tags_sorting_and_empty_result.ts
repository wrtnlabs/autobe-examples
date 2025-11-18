import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

/**
 * Verify admin product tag search sorting and empty-result pagination behavior.
 *
 * Business goal:
 *
 * - Ensure PATCH /shoppingMall/admin/productTags honors sort_by/sort_direction
 *   for tag name and returns tags in deterministic alphabetical order.
 * - Ensure the same endpoint returns a consistent empty page (data = []) and
 *   correct pagination metadata when no tags match the search criteria.
 *
 * End-to-end flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated
 *    connection.
 * 2. As this admin, create three product tags with labels that sort clearly in
 *    ascending order: "Alpha", "Beta", "Gamma" (and corresponding unique
 *    codes).
 * 3. Call PATCH /shoppingMall/admin/productTags with an
 *    IShoppingMallProductTag.IRequest body where:
 *
 *    - Search = null (no keyword filter)
 *    - Created_from/created_to/updated_from/updated_to = null (no date filters)
 *    - Page = 1
 *    - Page_size = 10
 *    - Sort_by = "name"
 *    - Sort_direction = "asc" and assert that:
 *    - Pagination.current === 1
 *    - Pagination.limit === 10
 *    - Pagination.records is at least the number of tags we just created
 *    - Data contains at least our three tags
 *    - Within the subset of our three tags, ordering by name is Alpha, Beta, Gamma.
 * 4. Call PATCH /shoppingMall/admin/productTags again with the same pagination
 *    settings but search set to a random keyword that does not exist in any tag
 *    name or slug. Assert that:
 *
 *    - Pagination.current === 1
 *    - Pagination.limit === 10
 *    - Pagination.records === 0
 *    - Pagination.pages is 0 or 1 but consistent with records and limit (we simply
 *         assert 0 records and empty data; pages must be >= 0)
 *    - Data.length === 0
 *
 * This test focuses purely on business behavior around sorting and empty
 * results; it does not validate HTTP status codes or low-level type errors.
 */
export async function test_api_admin_search_product_tags_sorting_and_empty_result(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorized context
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!", // matches string & tags.Format<"password">
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create three deterministic product tags with ordered labels
  const tagBodies: IShoppingMallProductTag.ICreate[] = [
    {
      code: `code-alpha-${RandomGenerator.alphaNumeric(6)}`,
      label: "Alpha",
      description: undefined,
      isActive: true,
    },
    {
      code: `code-beta-${RandomGenerator.alphaNumeric(6)}`,
      label: "Beta",
      description: undefined,
      isActive: true,
    },
    {
      code: `code-gamma-${RandomGenerator.alphaNumeric(6)}`,
      label: "Gamma",
      description: undefined,
      isActive: true,
    },
  ];

  const createdTags: IShoppingMallProductTag[] = [];
  for (const body of tagBodies) {
    const created = await api.functional.shoppingMall.admin.productTags.create(
      connection,
      { body },
    );
    typia.assert(created);
    createdTags.push(created);
  }

  // 3. Search all tags sorted by name ascending
  const pageSize: number & tags.Type<"int32"> & tags.Minimum<1> = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const pageIndex: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const searchAllRequest = {
    search: null,
    created_from: null,
    created_to: null,
    updated_from: null,
    updated_to: null,
    page: pageIndex,
    page_size: pageSize,
    sort_by: "name",
    sort_direction: "asc",
  } satisfies IShoppingMallProductTag.IRequest;

  const allPage: IPageIShoppingMallProductTag.ISummary =
    await api.functional.shoppingMall.admin.productTags.index(connection, {
      body: searchAllRequest,
    });
  typia.assert(allPage);

  // Basic pagination assertions
  TestValidator.equals(
    "pagination current page should be 1 for full search",
    allPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match requested page_size for full search",
    allPage.pagination.limit,
    pageSize,
  );

  // Ensure we created at least three tags and they exist in the page data
  TestValidator.predicate(
    "pagination records should be >= number of created tags",
    allPage.pagination.records >= createdTags.length,
  );

  const summaryIdsInPage = allPage.data.map((s) => s.id);
  for (const created of createdTags) {
    TestValidator.predicate(
      `created tag ${created.id} should appear in search-all result page`,
      summaryIdsInPage.includes(created.id),
    );
  }

  // Extract our three summaries in the order they appear and verify sorted by name
  const ourSummaries = allPage.data.filter((s) =>
    createdTags.some((t) => t.id === s.id),
  );

  TestValidator.equals(
    "there should be three summaries corresponding to created tags",
    ourSummaries.length,
    createdTags.length,
  );

  const names = ourSummaries.map((s) => s.name);
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "created tags should be ordered by name ascending in search-all result",
    names,
    sortedNames,
  );

  // 4. Search with a keyword that yields no results
  const impossibleSearch = `__no_match_${RandomGenerator.alphaNumeric(12)}__`;

  const emptySearchRequest = {
    search: impossibleSearch,
    created_from: null,
    created_to: null,
    updated_from: null,
    updated_to: null,
    page: pageIndex,
    page_size: pageSize,
    sort_by: "name",
    sort_direction: "asc",
  } satisfies IShoppingMallProductTag.IRequest;

  const emptyPage: IPageIShoppingMallProductTag.ISummary =
    await api.functional.shoppingMall.admin.productTags.index(connection, {
      body: emptySearchRequest,
    });
  typia.assert(emptyPage);

  TestValidator.equals(
    "empty-search current page should be 1",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty-search limit should match requested page_size",
    emptyPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "empty-search records should be 0",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.predicate(
    "empty-search pages should be coherent with zero records",
    emptyPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "empty-search data should be empty array",
    emptyPage.data.length,
    0,
  );
}
