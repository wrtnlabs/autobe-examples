import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
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
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a customer can successfully view a refund snapshot for their own refund request after a seller has responded.
 *
 * This test validates the complete refund workflow:
 * 1. Seller and customer registration
 * 2. Customer places order and receives shipment
 * 3. Customer confirms delivery
 * 4. Customer creates refund request
 * 5. Seller responds to refund request (triggers snapshot creation)
 * 6. Customer views the refund snapshot
 *
 * The test verifies that snapshots accurately capture the refund request state at decision time
 * and are accessible to the requesting customer.
 */
export async function test_api_refund_snapshot_view_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    },
  });
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    },
  });
  // 3. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Customer places order from cart
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get order item for shipment
  const orderItemId = order.orderItems[0].id;
  // 5. Seller creates shipment for order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItemId],
          tracking_carrier: "FedEx",
          tracking_number: typia.random<string>(),
        },
      },
    );
  typia.assert(shipment);
  // 6. Customer confirms delivery to enable refund window
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 7. Customer creates refund request for delivered order item
  const refundReason = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 8. Seller responds to refund request (approve)
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRefundRequest);
  // Verify refund request has responded_at timestamp
  TestValidator.predicate(
    "refund request has responded_at timestamp",
    updatedRefundRequest.respondedAt !== null,
  );
  // 9. Customer views the refund snapshot
  // Note: Snapshot ID is assumed to be the same as refund request ID
  // In production, the backend should return the snapshot ID when creating it
  const snapshotId = refundRequest.id;
  const snapshot =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.at(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 10. Validate snapshot contents
  TestValidator.equals("snapshot id matches expected", snapshot.id, snapshotId);
  // Parse snapshot_data JSON to verify contents
  const snapshotData: any = JSON.parse(snapshot.snapshot_data);
  TestValidator.predicate(
    "snapshot_data contains reason",
    snapshotData.reason !== undefined,
  );
  TestValidator.equals(
    "snapshot_data reason matches original",
    snapshotData.reason,
    refundReason,
  );
  TestValidator.predicate(
    "snapshot_data contains status",
    snapshotData.status !== undefined,
  );
  TestValidator.equals(
    "snapshot_data status is approved",
    snapshotData.status,
    "approved",
  );
  TestValidator.predicate(
    "snapshot created_at matches responded_at",
    snapshot.created_at === updatedRefundRequest.respondedAt,
  );
  // Verify refundRequest in snapshot
  TestValidator.equals(
    "snapshot refundRequest id matches",
    snapshot.refundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "snapshot refundRequest reason matches",
    snapshot.refundRequest.reason,
    refundReason,
  );
  TestValidator.equals(
    "snapshot refundRequest status is approved",
    snapshot.refundRequest.status,
    "approved",
  );
  // Verify orderItem in refundRequest
  TestValidator.equals(
    "snapshot refundRequest orderItem id matches",
    snapshot.refundRequest.orderItem.id,
    orderItemId,
  );
}
