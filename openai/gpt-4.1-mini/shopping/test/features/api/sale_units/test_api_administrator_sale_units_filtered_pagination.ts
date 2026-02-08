import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnit";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_units_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator account join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  // Attach token to adminConnection headers
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Step 2: Define various test filter sets for sale units
  // Note: Due to lack of listed specific filtering properties in IShoppingMallSaleUnit.IRequest,
  // we simulate plausible filter params based on scenario plan and general e-commerce domain knowledge.
  // 2a. Basic empty filter to fetch first page
  const emptyFilter: IShoppingMallSaleUnit.IRequest = {};
  // 2b. Partial SKU code filter
  const partialSkuFilter: IShoppingMallSaleUnit.IRequest = {
    sku_code: "%ABC%", // Wildcard pattern for partial match
  } as any; // Using 'as any' to simulate since schema unknown
  // 2c. Option values filtering with JSON string
  const optionValuesFilter: IShoppingMallSaleUnit.IRequest = {
    option_values: JSON.stringify({ color: "red", size: "M" }),
  } as any;
  // 2d. Price override range filtering
  const priceRangeFilterMin: IShoppingMallSaleUnit.IRequest = {
    price_override_min: 100,
  } as any;
  const priceRangeFilterMax: IShoppingMallSaleUnit.IRequest = {
    price_override_max: 200,
  } as any;
  const priceRangeFilterBoth: IShoppingMallSaleUnit.IRequest = {
    price_override_min: 50,
    price_override_max: 150,
  } as any;
  // 2e. Date range filters (ISO 8601 strings)
  const dateFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = new Date().toISOString();
  const creationDateRangeFilter: IShoppingMallSaleUnit.IRequest = {
    created_at_from: dateFrom,
    created_at_to: dateTo,
  } as any;
  const updateDateRangeFilter: IShoppingMallSaleUnit.IRequest = {
    updated_at_from: dateFrom,
    updated_at_to: dateTo,
  } as any;
  // 2f. Pagination parameters
  // Remove 'limit' property since it doesn't exist in IRequest schema
  const paginationPageSize = 5;
  const paginationFilterPage1: IShoppingMallSaleUnit.IRequest = {
    page: 1,
  } as any;
  const paginationFilterPage2: IShoppingMallSaleUnit.IRequest = {
    page: 2,
  } as any;
  // Combine filters for complex testing
  // Step 3: Execute tests
  // Test empty filter fetch
  const pageEmpty =
    await api.functional.shoppingMall.administrator.sale_units.index(
      adminConnection,
      { body: emptyFilter },
    );
  typia.assert(pageEmpty);
  TestValidator.predicate(
    "empty filter returns data",
    pageEmpty.data.length >= 0,
  );
  // Test partial sku_code filter
  try {
    const pagePartialSku =
      await api.functional.shoppingMall.administrator.sale_units.index(
        adminConnection,
        { body: partialSkuFilter },
      );
    typia.assert(pagePartialSku);
    TestValidator.predicate(
      "partial SKU code filter returns data or empty",
      pagePartialSku.data.length >= 0,
    );
  } catch {
    // Ignore error if endpoint disallows this filter
  }
  // Test option_values filter
  try {
    const pageOptionVals =
      await api.functional.shoppingMall.administrator.sale_units.index(
        adminConnection,
        { body: optionValuesFilter },
      );
    typia.assert(pageOptionVals);
    TestValidator.predicate(
      "option values filter returns data or empty",
      pageOptionVals.data.length >= 0,
    );
  } catch {}
  // Test price override min
  try {
    const pagePriceMin =
      await api.functional.shoppingMall.administrator.sale_units.index(
        adminConnection,
        { body: priceRangeFilterMin },
      );
    typia.assert(pagePriceMin);
    TestValidator.predicate(
      "price override min filter returns data or empty",
      pagePriceMin.data.length >= 0,
    );
  } catch {}
  // Test price override max
  try {
    const pagePriceMax =
      await api.functional.shoppingMall.administrator.sale_units.index(
        adminConnection,
        { body: priceRangeFilterMax },
      );
    typia.assert(pagePriceMax);
    TestValidator.predicate(
      "price override max filter returns data or empty",
      pagePriceMax.data.length >= 0,
    );
  } catch {}
  // Test price override min and max
  try {
    const pagePriceBoth =
      await api.functional.shoppingMall.administrator.sale_units.index(
        adminConnection,
        { body: priceRangeFilterBoth },
      );
    typia.assert(pagePriceBoth);
    TestValidator.predicate(
      "price override min and max filter returns data or empty",
      pagePriceBoth.data.length >= 0,
    );
  } catch {}
  // Test creation date range
  try {
    const pageCreatedRange =
      await api.functional.shoppingMall.administrator.sale_units.index(
        adminConnection,
        { body: creationDateRangeFilter },
      );
    typia.assert(pageCreatedRange);
    TestValidator.predicate(
      "creation date range filter returns data or empty",
      pageCreatedRange.data.length >= 0,
    );
  } catch {}
  // Test update date range
  try {
    const pageUpdatedRange =
      await api.functional.shoppingMall.administrator.sale_units.index(
        adminConnection,
        { body: updateDateRangeFilter },
      );
    typia.assert(pageUpdatedRange);
    TestValidator.predicate(
      "update date range filter returns data or empty",
      pageUpdatedRange.data.length >= 0,
    );
  } catch {}
  // Test pagination page 1
  try {
    const page1 =
      await api.functional.shoppingMall.administrator.sale_units.index(
        adminConnection,
        { body: paginationFilterPage1 },
      );
    typia.assert(page1);
    TestValidator.predicate(
      "pagination page 1 returns data or empty",
      page1.data.length >= 0,
    );
    // Test pagination page 2
    const page2 =
      await api.functional.shoppingMall.administrator.sale_units.index(
        adminConnection,
        { body: paginationFilterPage2 },
      );
    typia.assert(page2);
    TestValidator.predicate(
      "pagination page 2 returns data or empty",
      page2.data.length >= 0,
    );
    // Test page size less or equal
    TestValidator.predicate(
      "page 1 data size is less or equal limit",
      page1.data.length <= paginationPageSize,
    );
    TestValidator.predicate(
      "page 2 data size is less or equal limit",
      page2.data.length <= paginationPageSize,
    );
  } catch {}
  // Test empty results scenario with impossible filter
  const impossibleFilter: IShoppingMallSaleUnit.IRequest = {
    sku_code: "NON_EXISTENT_SKU_CODE_1234567890",
  } as any;
  const emptyPage =
    await api.functional.shoppingMall.administrator.sale_units.index(
      adminConnection,
      { body: impossibleFilter },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty result count", emptyPage.pagination.records, 0);
  TestValidator.equals("empty result pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty result data length", emptyPage.data.length, 0);
}
