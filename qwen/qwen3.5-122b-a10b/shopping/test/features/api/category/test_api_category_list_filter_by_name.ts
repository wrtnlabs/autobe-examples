import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_list_filter_by_name(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering categories by name using partial match search.
   *
   * Validates the category search functionality using trigram-based partial matching. Tests various search scenarios including partial name matches, case-insensitivity, pagination with filtered results, and empty result handling.
   *
   * The test uses simulation mode since no category creation endpoint is available in the SDK. It focuses on verifying that search parameters are properly constructed and the response structure is correct.
   *
   * 1. Test partial name matching with substring search
   * 2. Test case-insensitive search functionality
   * 3. Test pagination with filtered results
   * 4. Test empty results handling
   * 5. Test special character handling in search terms
   */
  // 1. Test partial name matching
  const partialSearch: IEcommerceCategory.IRequest = {
    search: "elec",
    page: 1,
    limit: 10,
  } satisfies IEcommerceCategory.IRequest;
  const partialResult: IPageIEcommerceCategory.ISummary =
    await api.functional.ecommerce.categories.index(
      { ...connection, simulate: true },
      { body: partialSearch },
    );
  typia.assert(partialResult);
  // Validate pagination structure
  TestValidator.equals(
    "partial search has pagination",
    true,
    partialResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    partialResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    partialResult.pagination.limit > 0,
  );
  // 2. Test case-insensitive search
  const caseInsensitiveSearch: IEcommerceCategory.IRequest = {
    search: "ELECTRONICS",
    page: 1,
    limit: 20,
  } satisfies IEcommerceCategory.IRequest;
  const caseResult: IPageIEcommerceCategory.ISummary =
    await api.functional.ecommerce.categories.index(
      { ...connection, simulate: true },
      { body: caseInsensitiveSearch },
    );
  typia.assert(caseResult);
  // 3. Test pagination with filtered results
  const paginatedSearch: IEcommerceCategory.IRequest = {
    search: "home",
    page: 2,
    limit: 5,
  } satisfies IEcommerceCategory.IRequest;
  const paginatedResult: IPageIEcommerceCategory.ISummary =
    await api.functional.ecommerce.categories.index(
      { ...connection, simulate: true },
      { body: paginatedSearch },
    );
  typia.assert(paginatedResult);
  // Validate page number
  TestValidator.equals(
    "page 2 requested",
    paginatedResult.pagination.current,
    2,
  );
  TestValidator.equals("limit respected", paginatedResult.pagination.limit, 5);
  // 4. Test empty results handling
  const emptySearch: IEcommerceCategory.IRequest = {
    search: "zzzzzz_nonexistent_category_xyz",
    page: 1,
    limit: 10,
  } satisfies IEcommerceCategory.IRequest;
  const emptyResult: IPageIEcommerceCategory.ISummary =
    await api.functional.ecommerce.categories.index(
      { ...connection, simulate: true },
      { body: emptySearch },
    );
  typia.assert(emptyResult);
  // 5. Test special character handling
  const specialCharSearch: IEcommerceCategory.IRequest = {
    search: "test @#$%",
    page: 1,
    limit: 10,
  } satisfies IEcommerceCategory.IRequest;
  const specialCharResult: IPageIEcommerceCategory.ISummary =
    await api.functional.ecommerce.categories.index(
      { ...connection, simulate: true },
      { body: specialCharSearch },
    );
  typia.assert(specialCharResult);
  // 6. Test with no search parameter (should return all)
  const noSearch: IEcommerceCategory.IRequest = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceCategory.IRequest;
  const noSearchResult: IPageIEcommerceCategory.ISummary =
    await api.functional.ecommerce.categories.index(
      { ...connection, simulate: true },
      { body: noSearch },
    );
  typia.assert(noSearchResult);
  // Validate response structure
  TestValidator.predicate("has data array", Array.isArray(noSearchResult.data));
  TestValidator.predicate(
    "pagination records >= data length",
    noSearchResult.pagination.records >= noSearchResult.data.length,
  );
}
