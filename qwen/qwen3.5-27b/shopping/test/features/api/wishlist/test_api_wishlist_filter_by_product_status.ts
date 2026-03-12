import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_wishlist_filter_by_product_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Test filtering by product_status='in_stock'
  // Note: Without product creation API, we validate that the filter parameter is accepted
  // and returns valid pagination structure (may return empty results)
  const inStockResult =
    await api.functional.shoppingMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          product_status: "in_stock",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(inStockResult);
  TestValidator.predicate(
    "in_stock filter returns valid pagination",
    () =>
      inStockResult.pagination.current >= 1 &&
      inStockResult.pagination.limit >= 1 &&
      inStockResult.pagination.records >= 0 &&
      inStockResult.pagination.pages >= 0,
  );
  TestValidator.predicate("in_stock filter returns data array", () =>
    Array.isArray(inStockResult.data),
  );
  // 3. Test filtering by product_status='out_of_stock'
  const outOfStockResult =
    await api.functional.shoppingMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          product_status: "out_of_stock",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(outOfStockResult);
  TestValidator.predicate(
    "out_of_stock filter returns valid pagination",
    () =>
      outOfStockResult.pagination.current >= 1 &&
      outOfStockResult.pagination.limit >= 1 &&
      outOfStockResult.pagination.records >= 0 &&
      outOfStockResult.pagination.pages >= 0,
  );
  TestValidator.predicate("out_of_stock filter returns data array", () =>
    Array.isArray(outOfStockResult.data),
  );
  // 4. Test filtering by product_status='deleted'
  const deletedResult =
    await api.functional.shoppingMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          product_status: "deleted",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(deletedResult);
  TestValidator.predicate(
    "deleted filter returns valid pagination",
    () =>
      deletedResult.pagination.current >= 1 &&
      deletedResult.pagination.limit >= 1 &&
      deletedResult.pagination.records >= 0 &&
      deletedResult.pagination.pages >= 0,
  );
  TestValidator.predicate("deleted filter returns data array", () =>
    Array.isArray(deletedResult.data),
  );
  // 5. Test without product_status filter (default behavior - all items)
  const allResult = await api.functional.shoppingMall.customer.wishlist.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallWishlistItem.IRequest,
    },
  );
  typia.assert(allResult);
  TestValidator.predicate(
    "no filter returns valid pagination",
    () =>
      allResult.pagination.current >= 1 &&
      allResult.pagination.limit >= 1 &&
      allResult.pagination.records >= 0 &&
      allResult.pagination.pages >= 0,
  );
  TestValidator.predicate("no filter returns data array", () =>
    Array.isArray(allResult.data),
  );
  // 6. Test with additional pagination and sorting parameters
  const paginatedResult =
    await api.functional.shoppingMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          product_status: "in_stock",
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination page parameter applied correctly",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit parameter applied correctly",
    paginatedResult.pagination.limit,
    10,
  );
  // 7. Test date range filtering with product_status
  const dateFilteredResult =
    await api.functional.shoppingMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          product_status: "out_of_stock",
          created_after: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_before: new Date().toISOString(),
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(dateFilteredResult);
  TestValidator.predicate(
    "date range filter with product_status returns valid response",
    () =>
      dateFilteredResult.pagination.current >= 1 &&
      Array.isArray(dateFilteredResult.data),
  );
}
