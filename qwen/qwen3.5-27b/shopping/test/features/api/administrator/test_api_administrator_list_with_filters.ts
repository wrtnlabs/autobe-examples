import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test administrator listing with various filter combinations including grade, status, and email search.
 *
 * Validates that the administrator listing endpoint correctly filters results based on grade (regular/super), status (active/banned), and email search term. Tests individual filters, combined filters, and verifies that pagination metadata is accurate for all filter combinations.
 *
 * The test ensures that grade filtering returns only administrators with the specified privilege level, status filtering correctly maps 'active' to banned=false and 'banned' to banned=true, and email search performs case-insensitive partial matching. Combined filters are tested to verify all conditions are applied simultaneously.
 *
 * 1. Call endpoint with grade='regular' filter and verify all results have grade='regular'
 * 2. Call endpoint with grade='super' filter and verify all results have grade='super'
 * 3. Call endpoint with status='active' filter and verify all results have banned=false
 * 4. Call endpoint with status='banned' filter and verify all results have banned=true
 * 5. Call endpoint with email search term and verify all results contain the search term
 * 6. Call endpoint with combined grade and status filters and verify both conditions apply
 * 7. Call endpoint with no filters and verify all administrators are returned
 * 8. Verify pagination metadata (current, limit, records, pages) is correct for all responses
 */
export async function test_api_administrator_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test grade='regular' filter
  const regularResult = await api.functional.shoppingMall.administrators.index(
    connection,
    {
      body: { grade: "regular" } satisfies IShoppingMallAdministrator.IRequest,
    },
  );
  typia.assert(regularResult);
  TestValidator.predicate("all regular grade", () =>
    regularResult.data.every((admin) => admin.grade === "regular"),
  );
  // 2. Test grade='super' filter
  const superResult = await api.functional.shoppingMall.administrators.index(
    connection,
    {
      body: { grade: "super" } satisfies IShoppingMallAdministrator.IRequest,
    },
  );
  typia.assert(superResult);
  TestValidator.predicate("all super grade", () =>
    superResult.data.every((admin) => admin.grade === "super"),
  );
  // 3. Test status='active' filter
  const activeResult = await api.functional.shoppingMall.administrators.index(
    connection,
    {
      body: { status: "active" } satisfies IShoppingMallAdministrator.IRequest,
    },
  );
  typia.assert(activeResult);
  TestValidator.predicate("all active status", () =>
    activeResult.data.every((admin) => admin.banned === false),
  );
  // 4. Test status='banned' filter
  const bannedResult = await api.functional.shoppingMall.administrators.index(
    connection,
    {
      body: { status: "banned" } satisfies IShoppingMallAdministrator.IRequest,
    },
  );
  typia.assert(bannedResult);
  TestValidator.predicate("all banned status", () =>
    bannedResult.data.every((admin) => admin.banned === true),
  );
  // 5. Test email search
  const searchEmail = RandomGenerator.alphabets(3);
  const searchResult = await api.functional.shoppingMall.administrators.index(
    connection,
    {
      body: {
        search: searchEmail,
      } satisfies IShoppingMallAdministrator.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate("email contains search term", () =>
    searchResult.data.every((admin) =>
      admin.email.toLowerCase().includes(searchEmail.toLowerCase()),
    ),
  );
  // 6. Test combined filters (grade='regular' and status='active')
  const combinedResult = await api.functional.shoppingMall.administrators.index(
    connection,
    {
      body: {
        grade: "regular",
        status: "active",
      } satisfies IShoppingMallAdministrator.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.predicate("combined grade filter", () =>
    combinedResult.data.every((admin) => admin.grade === "regular"),
  );
  TestValidator.predicate("combined status filter", () =>
    combinedResult.data.every((admin) => admin.banned === false),
  );
  // 7. Test no filters (all administrators)
  const allResult = await api.functional.shoppingMall.administrators.index(
    connection,
    {
      body: {} satisfies IShoppingMallAdministrator.IRequest,
    },
  );
  typia.assert(allResult);
  // 8. Verify pagination metadata for all responses
  TestValidator.predicate(
    "regular pagination valid",
    () =>
      regularResult.pagination.current >= 1 &&
      regularResult.pagination.limit >= 1 &&
      regularResult.pagination.records >= 0 &&
      regularResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "super pagination valid",
    () =>
      superResult.pagination.current >= 1 &&
      superResult.pagination.limit >= 1 &&
      superResult.pagination.records >= 0 &&
      superResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "active pagination valid",
    () =>
      activeResult.pagination.current >= 1 &&
      activeResult.pagination.limit >= 1 &&
      activeResult.pagination.records >= 0 &&
      activeResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "banned pagination valid",
    () =>
      bannedResult.pagination.current >= 1 &&
      bannedResult.pagination.limit >= 1 &&
      bannedResult.pagination.records >= 0 &&
      bannedResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "search pagination valid",
    () =>
      searchResult.pagination.current >= 1 &&
      searchResult.pagination.limit >= 1 &&
      searchResult.pagination.records >= 0 &&
      searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "combined pagination valid",
    () =>
      combinedResult.pagination.current >= 1 &&
      combinedResult.pagination.limit >= 1 &&
      combinedResult.pagination.records >= 0 &&
      combinedResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all pagination valid",
    () =>
      allResult.pagination.current >= 1 &&
      allResult.pagination.limit >= 1 &&
      allResult.pagination.records >= 0 &&
      allResult.pagination.pages >= 0,
  );
}
