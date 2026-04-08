import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test administrator filtering of cancellation request snapshots by date range.
 *
 * Validates that administrators can filter cancellation request snapshots using createdAtFrom and createdAtTo parameters. The test creates multiple cancellation requests with snapshots at different timestamps, then verifies that date range filtering returns only snapshots within the specified range. Edge cases including empty result sets and boundary conditions are tested.
 *
 * Special attention is given to verifying that:
 * - Snapshots are correctly filtered by the start date (createdAtFrom)
 * - Snapshots are correctly filtered by the end date (createdAtTo)
 * - Combined date range filtering works accurately
 * - Empty results return proper pagination metadata (records=0, pages=0)
 * - Timestamps are in ISO 8601 format with timezone
 * - Results maintain descending sort order by created_at within filtered sets
 *
 * 1. Register administrator, customer, and seller accounts
 * 2. Seller creates a product with variant and inventory
 * 3. Customer places an order containing the product variant
 * 4. Customer creates multiple cancellation requests for order items
 * 5. Seller responds to each cancellation request at different times to create snapshots
 * 6. Administrator filters snapshots by createdAtFrom (start date only)
 * 7. Administrator filters snapshots by createdAtTo (end date only)
 * 8. Administrator filters snapshots by both createdAtFrom and createdAtTo (date range)
 * 9. Test edge case with date range that has no snapshots
 * 10. Verify snapshot timestamps and pagination metadata
 */
export async function test_api_cancellation_request_snapshot_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Customer places an order (checkout) - utility function handles cart
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has items
  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );
  // 6. Create first cancellation request
  const cancellationRequest1 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[0].id,
          reason:
            "Customer wants to cancel first item - this is a test reason with enough characters",
        },
      },
    );
  typia.assert(cancellationRequest1);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 7. Seller responds to first cancellation request (creates snapshot 1)
  const snapshot1Time = new Date().toISOString();
  await api.functional.shoppingMall.seller.cancellation_requests.update(
    sellerConnection,
    {
      cancellationRequestId: cancellationRequest1.id,
      body: {
        status: "approved",
        response_reason: "Seller approved first cancellation request",
      },
    },
  );
  // Wait to create time gap
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 8. Place another order for second cancellation request
  const order2 = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order2);
  TestValidator.predicate(
    "order2 has at least one item",
    order2.items.length > 0,
  );
  const cancellationRequest2 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order2.items[0].id,
          reason:
            "Customer wants to cancel second item - this is another test reason",
        },
      },
    );
  typia.assert(cancellationRequest2);
  // Wait a moment
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 9. Seller responds to second cancellation request (creates snapshot 2)
  const snapshot2Time = new Date().toISOString();
  await api.functional.shoppingMall.seller.cancellation_requests.update(
    sellerConnection,
    {
      cancellationRequestId: cancellationRequest2.id,
      body: {
        status: "rejected",
        response_reason: "Seller rejected second cancellation request",
      },
    },
  );
  // Wait to create time gap
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 10. Place third order for third cancellation request
  const order3 = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order3);
  TestValidator.predicate(
    "order3 has at least one item",
    order3.items.length > 0,
  );
  const cancellationRequest3 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order3.items[0].id,
          reason:
            "Customer wants to cancel third item - this is the final test reason",
        },
      },
    );
  typia.assert(cancellationRequest3);
  // Wait a moment
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 11. Seller responds to third cancellation request (creates snapshot 3)
  const snapshot3Time = new Date().toISOString();
  await api.functional.shoppingMall.seller.cancellation_requests.update(
    sellerConnection,
    {
      cancellationRequestId: cancellationRequest3.id,
      body: {
        status: "approved",
        response_reason: "Seller approved third cancellation request",
      },
    },
  );
  // 12. Test filtering by createdAtFrom (start date only)
  const fromDate = snapshot2Time;
  const filterFromResult =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          createdAtFrom: fromDate,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(filterFromResult);
  TestValidator.predicate(
    "filter from returns snapshots on or after start date",
    filterFromResult.data.every((snap) => snap.created_at >= fromDate),
  );
  TestValidator.predicate(
    "filter from returns at least 2 snapshots",
    filterFromResult.data.length >= 2,
  );
  // 13. Test filtering by createdAtTo (end date only)
  const toDate = snapshot2Time;
  const filterToResult =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          createdAtTo: toDate,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(filterToResult);
  TestValidator.predicate(
    "filter to returns snapshots on or before end date",
    filterToResult.data.every((snap) => snap.created_at <= toDate),
  );
  TestValidator.predicate(
    "filter to returns at least 2 snapshots",
    filterToResult.data.length >= 2,
  );
  // 14. Test filtering by date range (both createdAtFrom and createdAtTo)
  const rangeFrom = snapshot1Time;
  const rangeTo = snapshot2Time;
  const filterRangeResult =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          createdAtFrom: rangeFrom,
          createdAtTo: rangeTo,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(filterRangeResult);
  TestValidator.predicate(
    "date range filter returns snapshots within range",
    filterRangeResult.data.every(
      (snap) => snap.created_at >= rangeFrom && snap.created_at <= rangeTo,
    ),
  );
  TestValidator.predicate(
    "date range returns at least 2 snapshots",
    filterRangeResult.data.length >= 2,
  );
  // 15. Test edge case: date range with no snapshots (future date)
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const emptyResult =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          createdAtFrom: futureDate,
          createdAtTo: futureDate,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty date range returns 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty date range returns 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty date range returns empty data array",
    emptyResult.data.length,
    0,
  );
  // 16. Verify snapshots are sorted by created_at descending
  const allSnapshots =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "snapshots are sorted by created_at descending",
    allSnapshots.data.every((snap, index, array) => {
      if (index === 0) return true;
      return snap.created_at <= array[index - 1].created_at;
    }),
  );
  // 17. Verify timestamp format is ISO 8601
  TestValidator.predicate(
    "timestamps are in ISO 8601 format",
    allSnapshots.data.every((snap) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(snap.created_at),
    ),
  );
}
