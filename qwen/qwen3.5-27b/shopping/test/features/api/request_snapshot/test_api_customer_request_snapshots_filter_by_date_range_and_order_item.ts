import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer request snapshot filtering by date range and order item ID.
 *
 * Validates that customers can filter their request snapshots (cancellation and refund request audit records) using date range filters (created_at_from, created_at_to) and specific order item ID filter. Ensures correct pagination structure is returned even when no snapshots match the filters.
 *
 * The test verifies that:
 * - Date range filtering correctly returns snapshots within the specified time window
 * - Order item ID filtering returns only snapshots for the specified order item
 * - Combined filters work with AND logic
 * - Empty result sets return valid pagination with records=0 and pages=0
 * - Each snapshot includes complete order item context
 *
 * 1. Register and authenticate a customer
 * 2. Query request snapshots with date range filter
 * 3. Verify pagination structure and snapshot data completeness
 * 4. Query with order item ID filter
 * 5. Test combined date range and order item filters
 * 6. Validate empty results return correct pagination
 */
export async function test_api_customer_request_snapshots_filter_by_date_range_and_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Query with date range filter (broad range to capture any existing snapshots)
  const dateRangeResult =
    await api.functional.shoppingMall.customer.request_snapshots.index(
      customerConnection,
      {
        body: {
          created_at_from: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_to: new Date().toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate pagination structure
  TestValidator.equals("has pagination", dateRangeResult.pagination.current, 1);
  TestValidator.equals("limit matches", dateRangeResult.pagination.limit, 20);
  TestValidator.predicate(
    "records count valid",
    dateRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    dateRangeResult.pagination.pages >= 0,
  );
  // Validate snapshot data structure if any snapshots exist
  if (dateRangeResult.data.length > 0) {
    const snapshot = dateRangeResult.data[0];
    // Verify snapshot has required fields
    TestValidator.predicate("has id", snapshot.id !== undefined);
    TestValidator.predicate(
      "has request_type",
      snapshot.request_type === "cancellation" ||
        snapshot.request_type === "refund",
    );
    TestValidator.predicate(
      "has status_before",
      snapshot.status_before !== undefined,
    );
    TestValidator.predicate(
      "has status_after",
      snapshot.status_after === "approved" ||
        snapshot.status_after === "rejected",
    );
    TestValidator.predicate(
      "has created_at",
      snapshot.created_at !== undefined,
    );
    // Verify date range filtering worked
    const snapshotDate = new Date(snapshot.created_at);
    const fromDate = new Date(
      dateRangeResult.pagination.current === 1
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        : snapshot.created_at,
    );
    const toDate = new Date();
    TestValidator.predicate(
      "snapshot within date range",
      snapshotDate >= fromDate && snapshotDate <= toDate,
    );
    // Verify order item context is included
    TestValidator.predicate("has orderItem", snapshot.orderItem !== undefined);
    TestValidator.predicate(
      "orderItem has id",
      snapshot.orderItem.id !== undefined,
    );
    TestValidator.predicate(
      "orderItem has quantity",
      snapshot.orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "orderItem has price",
      snapshot.orderItem.price > 0,
    );
  }
  // 3. Query with order item ID filter (using first snapshot's order item if available)
  let orderItemFilterResult: IPageIShoppingMallRequestSnapshot.ISummary;
  if (dateRangeResult.data.length > 0) {
    const orderItemId = dateRangeResult.data[0].orderItem.id;
    orderItemFilterResult =
      await api.functional.shoppingMall.customer.request_snapshots.index(
        customerConnection,
        {
          body: {
            shopping_mall_order_item_id: orderItemId,
            page: 1,
            limit: 20,
          } satisfies IShoppingMallRequestSnapshot.IRequest,
        },
      );
    typia.assert(orderItemFilterResult);
    // Verify all returned snapshots are for the specified order item
    TestValidator.predicate(
      "all snapshots for same order item",
      orderItemFilterResult.data.every((s) => s.orderItem.id === orderItemId),
    );
    // Verify pagination
    TestValidator.equals(
      "order item filter pagination current",
      orderItemFilterResult.pagination.current,
      1,
    );
    TestValidator.equals(
      "order item filter limit",
      orderItemFilterResult.pagination.limit,
      20,
    );
  }
  // 4. Test combined date range and order item filters
  let combinedFilterResult: IPageIShoppingMallRequestSnapshot.ISummary;
  if (dateRangeResult.data.length > 0) {
    const orderItemId = dateRangeResult.data[0].orderItem.id;
    combinedFilterResult =
      await api.functional.shoppingMall.customer.request_snapshots.index(
        customerConnection,
        {
          body: {
            shopping_mall_order_item_id: orderItemId,
            created_at_from: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            created_at_to: new Date().toISOString(),
            page: 1,
            limit: 20,
          } satisfies IShoppingMallRequestSnapshot.IRequest,
        },
      );
    typia.assert(combinedFilterResult);
    // Verify combined filters work (AND logic)
    TestValidator.predicate(
      "combined filter returns valid pagination",
      combinedFilterResult.pagination.pages >= 0,
    );
    // All snapshots should match both filters
    for (const snapshot of combinedFilterResult.data) {
      TestValidator.predicate(
        "snapshot matches order item",
        snapshot.orderItem.id === orderItemId,
      );
      const snapshotDate = new Date(snapshot.created_at);
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = new Date();
      TestValidator.predicate(
        "snapshot within date range",
        snapshotDate >= fromDate && snapshotDate <= toDate,
      );
    }
  }
  // 5. Test empty results with invalid order item ID
  const emptyResult =
    await api.functional.shoppingMall.customer.request_snapshots.index(
      customerConnection,
      {
        body: {
          shopping_mall_order_item_id: "00000000-0000-0000-0000-000000000000",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Verify empty result structure
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals("empty result limit", emptyResult.pagination.limit, 20);
  // 6. Test empty results with date range in the future
  const futureDateResult =
    await api.functional.shoppingMall.customer.request_snapshots.index(
      customerConnection,
      {
        body: {
          created_at_from: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_to: new Date(
            Date.now() + 730 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(futureDateResult);
  // Verify future date range returns empty
  TestValidator.equals(
    "future date range records",
    futureDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range pages",
    futureDateResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date range data length",
    futureDateResult.data.length,
    0,
  );
}
