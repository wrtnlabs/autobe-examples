import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuInventoryState";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate admin SKU inventory state search with basic filters and pagination.
 *
 * Business goal: Ensure that the administrative search endpoint for SKU
 * inventory states correctly returns paginated lists, respects the
 * `is_purchasable` filter, supports simple text search via the `search` field,
 * and is restricted to authenticated admin actors.
 *
 * Scenario steps:
 *
 * 1. Register a new admin using POST /auth/admin/join and rely on the SDK to
 *    attach the Authorization header via the returned token.
 * 2. As that admin, create four SKU inventory states via POST
 *    /shoppingMall/admin/skuInventoryStates with the following semantics:
 *
 *    - Purchasable: "in_stock", "preorder" (is_purchasable = true)
 *    - Non-purchasable: "out_of_stock", "discontinued" (is_purchasable = false)
 * 3. Call PATCH /shoppingMall/admin/skuInventoryStates with a body having page =
 *    1, a limit large enough to include all four records, no search term, and
 *    no `is_purchasable` filter.
 *
 *    - Assert that the pagination metadata reflects the number of created records
 *         (records >= createdCount, limit == requestedLimit, current == 1,
 *         pages >= 1).
 *    - Assert that all four created states are present in the first page.
 * 4. Call the same endpoint with `is_purchasable = true`.
 *
 *    - Verify that only the two purchasable codes are present in `data` and
 *         non-purchasable codes are absent.
 * 5. Call with `is_purchasable = false`.
 *
 *    - Verify that only non-purchasable codes appear and purchasable ones are
 *         excluded.
 * 6. Call with a `search` term that matches a fragment shared by some codes or
 *    names (for example, "stock").
 *
 *    - Verify that only inventory states whose `code` or `name` contain that
 *         fragment appear in results.
 * 7. Finally, construct an unauthenticated connection (same host, empty headers)
 *    and attempt to call the index endpoint, expecting it to fail due to
 *    missing admin authentication. Use TestValidator.error to assert that an
 *    error is thrown, without inspecting status codes.
 */
export async function test_api_admin_sku_inventory_states_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create multiple SKU inventory states with mixed purchasability
  const statesToCreate: Array<{
    code: string;
    name: string;
    is_purchasable: boolean;
  }> = [
    {
      code: "in_stock",
      name: "In stock",
      is_purchasable: true,
    },
    {
      code: "preorder",
      name: "Preorder",
      is_purchasable: true,
    },
    {
      code: "out_of_stock",
      name: "Out of stock",
      is_purchasable: false,
    },
    {
      code: "discontinued",
      name: "Discontinued",
      is_purchasable: false,
    },
  ];

  const createdStates: IShoppingMallSkuInventoryState[] = [];
  for (const spec of statesToCreate) {
    const body = {
      code: spec.code,
      name: spec.name,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_purchasable: spec.is_purchasable,
    } satisfies IShoppingMallSkuInventoryState.ICreate;

    const created: IShoppingMallSkuInventoryState =
      await api.functional.shoppingMall.admin.skuInventoryStates.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdStates.push(created);
  }

  const createdCount = createdStates.length;

  // Helper to extract codes from a page response
  const collectCodes = (
    page: IPageIShoppingMallSkuInventoryState.ISummary,
  ): string[] => page.data.map((s) => s.code);

  // 3. Fetch first page with no filters on is_purchasable
  const pageAllLimit = createdCount + 5;
  const requestAll = {
    page: 1 as number & tags.Type<"int32">,
    limit: pageAllLimit as number & tags.Type<"int32">,
  } satisfies IShoppingMallSkuInventoryState.IRequest;

  const pageAll: IPageIShoppingMallSkuInventoryState.ISummary =
    await api.functional.shoppingMall.admin.skuInventoryStates.index(
      connection,
      { body: requestAll },
    );
  typia.assert<IPageIShoppingMallSkuInventoryState.ISummary>(pageAll);

  const paginationAll = pageAll.pagination;
  TestValidator.equals(
    "pagination current page should be 1",
    paginationAll.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    paginationAll.limit,
    pageAllLimit,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    paginationAll.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records should be at least createdCount",
    paginationAll.records >= (createdCount as number),
  );

  const allCodes = collectCodes(pageAll);
  for (const created of createdStates) {
    TestValidator.predicate(
      `all listing includes created state code ${created.code}`,
      allCodes.includes(created.code),
    );
  }

  // 4. Filter is_purchasable = true
  const requestPurchasableTrue = {
    page: 1 as number & tags.Type<"int32">,
    limit: pageAllLimit as number & tags.Type<"int32">,
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.IRequest;

  const pagePurchasableTrue: IPageIShoppingMallSkuInventoryState.ISummary =
    await api.functional.shoppingMall.admin.skuInventoryStates.index(
      connection,
      { body: requestPurchasableTrue },
    );
  typia.assert<IPageIShoppingMallSkuInventoryState.ISummary>(
    pagePurchasableTrue,
  );

  const purchasableCodesExpected = statesToCreate
    .filter((s) => s.is_purchasable)
    .map((s) => s.code);
  const purchasableCodesActual = collectCodes(pagePurchasableTrue);

  for (const code of purchasableCodesExpected) {
    TestValidator.predicate(
      `is_purchasable=true listing includes code ${code}`,
      purchasableCodesActual.includes(code),
    );
  }

  const nonPurchasableCodesExpected = statesToCreate
    .filter((s) => !s.is_purchasable)
    .map((s) => s.code);
  for (const code of nonPurchasableCodesExpected) {
    TestValidator.predicate(
      `is_purchasable=true listing excludes non-purchasable code ${code}`,
      !purchasableCodesActual.includes(code),
    );
  }

  // 5. Filter is_purchasable = false
  const requestPurchasableFalse = {
    page: 1 as number & tags.Type<"int32">,
    limit: pageAllLimit as number & tags.Type<"int32">,
    is_purchasable: false,
  } satisfies IShoppingMallSkuInventoryState.IRequest;

  const pagePurchasableFalse: IPageIShoppingMallSkuInventoryState.ISummary =
    await api.functional.shoppingMall.admin.skuInventoryStates.index(
      connection,
      { body: requestPurchasableFalse },
    );
  typia.assert<IPageIShoppingMallSkuInventoryState.ISummary>(
    pagePurchasableFalse,
  );

  const nonPurchasableCodesActual = collectCodes(pagePurchasableFalse);

  for (const code of nonPurchasableCodesExpected) {
    TestValidator.predicate(
      `is_purchasable=false listing includes non-purchasable code ${code}`,
      nonPurchasableCodesActual.includes(code),
    );
  }
  for (const code of purchasableCodesExpected) {
    TestValidator.predicate(
      `is_purchasable=false listing excludes purchasable code ${code}`,
      !nonPurchasableCodesActual.includes(code),
    );
  }

  // 6. Search by fragment (e.g., "stock")
  const searchFragment = "stock";
  const requestSearch = {
    page: 1 as number & tags.Type<"int32">,
    limit: pageAllLimit as number & tags.Type<"int32">,
    search: searchFragment,
  } satisfies IShoppingMallSkuInventoryState.IRequest;

  const pageSearch: IPageIShoppingMallSkuInventoryState.ISummary =
    await api.functional.shoppingMall.admin.skuInventoryStates.index(
      connection,
      { body: requestSearch },
    );
  typia.assert<IPageIShoppingMallSkuInventoryState.ISummary>(pageSearch);

  const matchingCodesExpected = statesToCreate
    .filter(
      (s) => s.code.includes(searchFragment) || s.name.includes(searchFragment),
    )
    .map((s) => s.code);

  const matchingCodesActual = collectCodes(pageSearch);

  for (const code of matchingCodesActual) {
    TestValidator.predicate(
      `search results code ${code} should contain fragment in code or name`,
      statesToCreate.some(
        (s) =>
          s.code === code &&
          (s.code.includes(searchFragment) || s.name.includes(searchFragment)),
      ),
    );
  }

  for (const code of matchingCodesExpected) {
    TestValidator.predicate(
      `search listing includes expected matching code ${code}`,
      matchingCodesActual.includes(code),
    );
  }

  // 7. Verify admin-only access: unauthenticated connection should fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated index call should fail",
    async () => {
      await api.functional.shoppingMall.admin.skuInventoryStates.index(
        unauthenticatedConnection,
        { body: requestAll },
      );
    },
  );
}
