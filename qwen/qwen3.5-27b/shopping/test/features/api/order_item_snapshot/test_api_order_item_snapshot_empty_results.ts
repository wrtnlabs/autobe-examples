import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test viewing order item snapshots when customer has no orders (empty result set).
 *
 * Validates that the order item snapshots endpoint correctly handles empty result sets when a customer has not placed any orders. Ensures pagination metadata accurately reflects zero records and that various filter combinations return empty results without errors.
 *
 * Special attention is given to verifying that the endpoint gracefully handles queries for non-existent data and that pagination metadata (records, pages, current) is correctly set when no snapshots exist.
 *
 * 1. Authenticate a new customer who has not placed any orders yet.
 * 2. Call the order-item-snapshots endpoint with default pagination (no filters).
 * 3. Verify the response contains pagination metadata with records=0, pages=0, current=1 and empty data array.
 * 4. Test with various filter combinations (order_id, product_id, variant_id, seller_id, date range).
 * 5. Verify all filter combinations return empty results with appropriate pagination metadata.
 * 6. Verify the endpoint does not throw errors when querying for non-existent data.
 */
export async function test_api_order_item_snapshot_empty_results(
  connection: api.IConnection,
) {
  // 1. Authenticate a new customer with no order history
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Call order-item-snapshots with default pagination (no filters)
  const emptyResult =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 3. Verify empty result with correct pagination metadata
  TestValidator.equals(
    "records count is zero",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("pages count is zero", emptyResult.pagination.pages, 0);
  TestValidator.equals(
    "current page is one",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals("data array is empty", emptyResult.data.length, 0);
  // 4. Test with order_id filter (non-existent order)
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const withOrderIdFilter =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {
          order_id: nonExistentOrderId,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(withOrderIdFilter);
  TestValidator.equals(
    "order_id filter returns zero records",
    withOrderIdFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "order_id filter data is empty",
    withOrderIdFilter.data.length,
    0,
  );
  // 5. Test with product_id filter (non-existent product)
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  const withProductIdFilter =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {
          product_id: nonExistentProductId,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(withProductIdFilter);
  TestValidator.equals(
    "product_id filter returns zero records",
    withProductIdFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "product_id filter data is empty",
    withProductIdFilter.data.length,
    0,
  );
  // 6. Test with variant_id filter (non-existent variant)
  const nonExistentVariantId = typia.random<string & tags.Format<"uuid">>();
  const withVariantIdFilter =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {
          variant_id: nonExistentVariantId,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(withVariantIdFilter);
  TestValidator.equals(
    "variant_id filter returns zero records",
    withVariantIdFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "variant_id filter data is empty",
    withVariantIdFilter.data.length,
    0,
  );
  // 7. Test with seller_id filter (non-existent seller)
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  const withSellerIdFilter =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {
          seller_id: nonExistentSellerId,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(withSellerIdFilter);
  TestValidator.equals(
    "seller_id filter returns zero records",
    withSellerIdFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "seller_id filter data is empty",
    withSellerIdFilter.data.length,
    0,
  );
  // 8. Test with date range filter (past dates with no orders)
  const pastDateStart = new Date("2020-01-01T00:00:00Z").toISOString();
  const pastDateEnd = new Date("2020-12-31T23:59:59Z").toISOString();
  const withDateRangeFilter =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {
          created_at_start: pastDateStart,
          created_at_end: pastDateEnd,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(withDateRangeFilter);
  TestValidator.equals(
    "date range filter returns zero records",
    withDateRangeFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "date range filter data is empty",
    withDateRangeFilter.data.length,
    0,
  );
  // 9. Test with multiple filters combined
  const withMultipleFilters =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {
          order_id: nonExistentOrderId,
          product_id: nonExistentProductId,
          variant_id: nonExistentVariantId,
          seller_id: nonExistentSellerId,
          created_at_start: pastDateStart,
          created_at_end: pastDateEnd,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(withMultipleFilters);
  TestValidator.equals(
    "multiple filters return zero records",
    withMultipleFilters.pagination.records,
    0,
  );
  TestValidator.equals(
    "multiple filters data is empty",
    withMultipleFilters.data.length,
    0,
  );
  TestValidator.equals(
    "multiple filters pagination limit",
    withMultipleFilters.pagination.limit,
    20,
  );
  TestValidator.equals(
    "multiple filters current page",
    withMultipleFilters.pagination.current,
    1,
  );
  // 10. Test with pagination parameters on empty result
  const withPagination =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {
          page: 5,
          limit: 50,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(withPagination);
  TestValidator.equals(
    "pagination on empty result returns zero records",
    withPagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination on empty result pages is zero",
    withPagination.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page matches request",
    withPagination.pagination.current,
    5,
  );
  TestValidator.equals(
    "pagination limit matches request",
    withPagination.pagination.limit,
    50,
  );
  TestValidator.equals(
    "pagination on empty result data is empty",
    withPagination.data.length,
    0,
  );
}
