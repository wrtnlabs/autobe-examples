import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_refund_request_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the complete happy path where a seller rejects a pending refund request.
   *
   * This test validates:
   * - Seller can reject pending refund requests
   * - Status transitions from 'pending' to 'rejected'
   * - responded_at timestamp is set
   * - Order item status remains 'delivered'
   * - Snapshot is created for audit trail
   * - Customer cannot create duplicate refund request
   */
  // 1. Customer Setup - create and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Seller Setup - create and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Customer creates shipping address for checkout
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 4. Customer checks out (creates order with order items)
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 5. Seller creates shipment for the order items
  // Note: In test environment, we use random UUIDs for order_item_ids
  // as the order structure doesn't expose items directly
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: RandomGenerator.name(),
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment);
  // Get order item ID from shipment (shipment contains the order items that were shipped)
  const orderItemId = shipment.orderItems[0].id;
  // 6. Customer confirms delivery of the shipment
  const deliveredShipment =
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveredShipment);
  // 7. Customer creates refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  // Verify initial state of refund request
  TestValidator.equals(
    "initial status should be pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "responded_at should be null initially",
    refundRequest.respondedAt === null ||
      refundRequest.respondedAt === undefined,
  );
  // Store original order item status for comparison after rejection
  const originalOrderItemStatus = refundRequest.orderItem.status;
  // 8. Seller rejects the refund request
  const rejectedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          decision: "reject",
        },
      },
    );
  typia.assert(rejectedRefundRequest);
  // === Validation Points ===
  // 1. Status changed to 'rejected'
  TestValidator.equals(
    "status should be rejected after seller response",
    rejectedRefundRequest.status,
    "rejected",
  );
  // 2. responded_at timestamp is set
  TestValidator.predicate(
    "responded_at should be set after rejection",
    rejectedRefundRequest.respondedAt !== null &&
      rejectedRefundRequest.respondedAt !== undefined,
  );
  // 3. Order item status remains 'delivered' (no change)
  TestValidator.equals(
    "order item status should remain delivered",
    rejectedRefundRequest.orderItem.status,
    originalOrderItemStatus,
  );
  // 4. Snapshot is created for audit trail
  TestValidator.predicate(
    "snapshots array should exist",
    Array.isArray(rejectedRefundRequest.snapshots),
  );
  TestValidator.predicate(
    "at least one snapshot should exist",
    rejectedRefundRequest.snapshots.length > 0,
  );
  // 5. Verify snapshot content
  const snapshot = rejectedRefundRequest.snapshots[0];
  TestValidator.equals(
    "snapshot status should be rejected",
    snapshot.status,
    "rejected",
  );
  TestValidator.predicate(
    "snapshot should have reason text",
    snapshot.reason.length >= 10,
  );
  TestValidator.predicate(
    "snapshot should have created_at timestamp",
    snapshot.created_at !== undefined,
  );
  // 6. Verify customer cannot create another refund request for the same order item
  // (One refund request per order item constraint)
  await TestValidator.error(
    "customer should not be able to create duplicate refund request",
    async () => {
      await generate_random_shopping_mall_customer_refund_requests_create(
        customerConnection,
        {
          body: {
            orderItemId: orderItemId,
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    },
  );
}
