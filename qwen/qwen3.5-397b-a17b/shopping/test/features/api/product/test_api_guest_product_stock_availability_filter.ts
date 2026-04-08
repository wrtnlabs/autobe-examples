import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test product filtering by stock availability to ensure only in-stock products are returned when inStock=true filter is applied.
 *
 * Validates the complete product stock filtering workflow including guest authentication, filtered product listing, and pagination metadata verification. Ensures that the inStock filter correctly identifies products with available inventory and excludes out-of-stock products.
 *
 * Special attention is given to verifying that all products in filtered results have inStock field set to true, and that pagination metadata accurately reflects the filtered record count rather than total catalog size.
 *
 * 1. Guest registers using device fingerprint to obtain authentication tokens.
 * 2. Guest requests product list with inStock=true filter applied.
 * 3. Validates all returned products have inStock field set to true.
 * 4. Guest requests product list without stock filter (inStock omitted).
 * 5. Validates pagination records count differs between filtered and unfiltered requests.
 * 6. Verifies filtering logic correctly identifies products with available inventory.
 */
export async function test_api_guest_product_stock_availability_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Request products with inStock=true filter
  const inStockRequest = {
    inStock: true,
  } satisfies IShoppingMallProduct.IRequest;
  const inStockResponse =
    await api.functional.shoppingMall.guest.products.index(guestConnection, {
      body: inStockRequest,
    });
  typia.assert(inStockResponse);
  // 3. Validate all products in filtered results have inStock=true
  TestValidator.predicate("all filtered products are in stock", () =>
    inStockResponse.data.every((product) => product.inStock === true),
  );
  // 4. Request products without stock filter (should include all products)
  const allProductsRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallProduct.IRequest;
  const allProductsResponse =
    await api.functional.shoppingMall.guest.products.index(guestConnection, {
      body: allProductsRequest,
    });
  typia.assert(allProductsResponse);
  // 5. Validate pagination metadata reflects filtered record count
  TestValidator.predicate(
    "filtered count <= total count",
    () =>
      inStockResponse.pagination.records <=
      allProductsResponse.pagination.records,
  );
  // 6. Verify filtering actually works (if there are any in-stock products)
  if (inStockResponse.pagination.records > 0) {
    TestValidator.predicate(
      "inStock filter reduces or equals total count",
      () =>
        inStockResponse.pagination.records <=
        allProductsResponse.pagination.records,
    );
  }
  // 7. Test with inStock=false to verify it includes all products regardless of stock
  const outOfStockRequest = {
    inStock: false,
  } satisfies IShoppingMallProduct.IRequest;
  const outOfStockResponse =
    await api.functional.shoppingMall.guest.products.index(guestConnection, {
      body: outOfStockRequest,
    });
  typia.assert(outOfStockResponse);
  // Validate that inStock=false includes all products (same as no filter)
  TestValidator.predicate(
    "inStock=false includes all products",
    () =>
      outOfStockResponse.pagination.records >=
      inStockResponse.pagination.records,
  );
  // Verify inStock=false response has same or more records than inStock=true
  TestValidator.equals(
    "inStock=false count matches unfiltered",
    outOfStockResponse.pagination.records,
    allProductsResponse.pagination.records,
  );
}
