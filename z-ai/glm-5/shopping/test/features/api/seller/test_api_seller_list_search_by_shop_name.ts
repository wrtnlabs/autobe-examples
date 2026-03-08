import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_list_search_by_shop_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get initial list of sellers to have reference data
  const allSellers = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {} satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(allSellers);
  // 2. Test partial matching - extract a substring from a shop name if sellers exist
  if (allSellers.data.length > 0) {
    const firstSeller = allSellers.data[0];
    const shopNamePart = firstSeller.shop_name.substring(
      0,
      Math.ceil(firstSeller.shop_name.length / 2),
    );
    const partialSearchResult = await api.functional.shoppingMall.sellers.index(
      connection,
      {
        body: {
          shopName: shopNamePart,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(partialSearchResult);
    // Verify partial match returns results containing the search term
    TestValidator.predicate(
      "partial match returns results",
      partialSearchResult.data.length > 0,
    );
    // All returned sellers should have shop_name containing the search term (case-insensitive)
    const allMatchPartial = partialSearchResult.data.every((seller) =>
      seller.shop_name.toLowerCase().includes(shopNamePart.toLowerCase()),
    );
    TestValidator.predicate(
      "all results match partial search",
      allMatchPartial,
    );
    // 3. Test case-insensitive search
    const upperCaseSearch = shopNamePart.toUpperCase();
    const caseInsensitiveResult =
      await api.functional.shoppingMall.sellers.index(connection, {
        body: {
          shopName: upperCaseSearch,
        } satisfies IShoppingMallSeller.IRequest,
      });
    typia.assert(caseInsensitiveResult);
    // Results should be same regardless of case
    TestValidator.equals(
      "case-insensitive search returns same results",
      partialSearchResult.data.length,
      caseInsensitiveResult.data.length,
    );
    // 4. Test combined filters - shop name with approvalStatus
    const combinedResult = await api.functional.shoppingMall.sellers.index(
      connection,
      {
        body: {
          shopName: shopNamePart,
          approvalStatus: "approved",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(combinedResult);
    // Combined result should only contain approved sellers matching shop name
    const allApprovedMatch = combinedResult.data.every(
      (seller) =>
        seller.approval_status === "approved" &&
        seller.shop_name.toLowerCase().includes(shopNamePart.toLowerCase()),
    );
    TestValidator.predicate(
      "combined filter returns approved sellers matching shop name",
      allApprovedMatch,
    );
    // 5. Test combined with suspended filter
    const suspendedResult = await api.functional.shoppingMall.sellers.index(
      connection,
      {
        body: {
          shopName: shopNamePart,
          suspended: false,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(suspendedResult);
    const allNotSuspendedMatch = suspendedResult.data.every(
      (seller) =>
        seller.suspended === false &&
        seller.shop_name.toLowerCase().includes(shopNamePart.toLowerCase()),
    );
    TestValidator.predicate(
      "suspended filter returns non-suspended sellers matching shop name",
      allNotSuspendedMatch,
    );
  }
  // 6. Test empty results - search for non-existent shop name
  const nonExistentName = `NonExistentShop_${RandomGenerator.alphabets(10)}`;
  const emptyResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        shopName: nonExistentName,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify empty results have correct pagination
  TestValidator.equals(
    "empty result - data array length",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result - records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result - pages", emptyResult.pagination.pages, 0);
  // 7. Test pagination with shop name search
  if (allSellers.data.length > 0) {
    const shopNamePart = allSellers.data[0].shop_name.substring(0, 2);
    const paginatedResult = await api.functional.shoppingMall.sellers.index(
      connection,
      {
        body: {
          shopName: shopNamePart,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(paginatedResult);
    TestValidator.equals(
      "pagination - current page",
      paginatedResult.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination - limit respected",
      paginatedResult.data.length <= 5,
    );
  }
}
