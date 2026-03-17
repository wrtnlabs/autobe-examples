import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test customer refund request snapshot retrieval.
 *
 * This test verifies that customers can retrieve the complete snapshot history
 * for their refund requests, ensuring full visibility into the audit trail
 * from submission through resolution.
 *
 * Workflow:
 * 1. Customer registers and authenticates
 * 2. Customer creates an order (using utility function which handles product setup)
 * 3. Customer confirms delivery of the shipment (marking items as DELIVERED)
 * 4. Customer creates a refund request for the delivered order item
 * 5. Customer retrieves snapshot history for the refund request
 * 6. Validate snapshot data structure and audit trail integrity
 */
export async function test_api_customer_refund_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create order using utility function (handles product setup internally)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  // 3. Get the first order item and its shipment
  const orderItem = order.items[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  // Find shipment containing this order item
  const shipment = order.shipments.find((s) =>
    s.items.some((item) => item.id === orderItem.id),
  );
  TestValidator.predicate(
    "shipment exists for order item",
    shipment !== undefined,
  );
  if (!shipment) {
    throw new Error("No shipment found for order item");
  }
  // 4. Confirm delivery to mark order item as DELIVERED (required for refund request)
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  TestValidator.predicate(
    "delivery confirmed timestamp set",
    confirmedShipment.delivery_confirmed_at !== null,
  );
  // 5. Create refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request order item matches",
    refundRequest.order_item_id,
    orderItem.id,
  );
  TestValidator.equals(
    "refund request status is PENDING",
    refundRequest.status,
    "PENDING",
  );
  // 6. Retrieve snapshot history for the refund request
  const snapshots =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 100,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate snapshot history structure and content
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(snapshots.data),
  );
  TestValidator.predicate(
    "at least one snapshot exists (initial request)",
    snapshots.data.length >= 1,
  );
  // Validate first snapshot (most recent due to desc sort)
  const firstSnapshot = snapshots.data[0];
  TestValidator.predicate(
    "snapshot status is valid enum value",
    ["PENDING", "APPROVED", "REJECTED"].includes(firstSnapshot.status),
  );
  TestValidator.equals(
    "snapshot reason matches request",
    firstSnapshot.reason,
    refundRequest.reason,
  );
  TestValidator.predicate(
    "snapshot has timestamp",
    typeof firstSnapshot.snapshot_at === "string",
  );
  TestValidator.predicate(
    "snapshot has requested_at timestamp",
    typeof firstSnapshot.requested_at === "string",
  );
  // Validate customer information in snapshot
  TestValidator.equals(
    "snapshot customer ID matches",
    firstSnapshot.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "snapshot customer email matches",
    firstSnapshot.customer.email,
    customerAuth.email,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", snapshots.pagination.current, 1);
  TestValidator.predicate("limit is set", snapshots.pagination.limit > 0);
  TestValidator.predicate(
    "records count matches data length",
    snapshots.pagination.records >= snapshots.data.length,
  );
  TestValidator.predicate(
    "pages count is valid",
    snapshots.pagination.pages >= 1,
  );
}
