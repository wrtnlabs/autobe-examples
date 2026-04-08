import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_customer_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_orders_items_refund_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_customer_refund_request_delivered_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(customerAuth);
  // 2. Create order with items
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    { body: undefined },
  );
  typia.assert(order);
  // Verify order has shipments
  TestValidator.equals("has shipments", order.shipments.length > 0, true);
  // Get first shipment for delivery confirmation
  const shipment = order.shipments[0];
  typia.assert(shipment);
  TestValidator.equals(
    "shipment status is shipped",
    shipment.status,
    "shipped",
  );
  // 3. Confirm delivery for shipment
  const deliveredShipment =
    await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(deliveredShipment);
  // Verify shipment status changed to delivered
  TestValidator.equals(
    "shipment status is delivered",
    deliveredShipment.status,
    "delivered",
  );
  // Get first shipment item to get order item reference
  TestValidator.equals(
    "has shipment items",
    deliveredShipment.shipment_items.length > 0,
    true,
  );
  const shipmentItem = deliveredShipment.shipment_items[0];
  typia.assert(shipmentItem);
  // Get order item from original order
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // Store reason for verification
  const refundReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  // 4. Submit refund request
  const refundRequest =
    await generate_random_ecommerce_mall_member_customer_orders_items_refund_create(
      customerConnection,
      {
        body: { reason: refundReason },
        params: { orderId: order.id, itemId: orderItem.id },
      },
    );
  typia.assert(refundRequest);
  // 5. Validate refund request properties
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request linked to order item",
    refundRequest.order_item_id,
    orderItem.id,
  );
  TestValidator.equals(
    "refund reason preserved",
    refundRequest.reason,
    refundReason,
  );
  TestValidator.equals(
    "approved_by_seller_id is null",
    refundRequest.approved_by_seller_id,
    null,
  );
  TestValidator.equals(
    "rejected_by_seller_id is null",
    refundRequest.rejected_by_seller_id,
    null,
  );
  TestValidator.equals(
    "order item status is delivered",
    orderItem.status,
    "delivered",
  );
  // Verify timestamps are valid date-time format
  TestValidator.predicate("created_at is valid date-time", () =>
    typia.is<string & tags.Format<"date-time">>(refundRequest.created_at),
  );
  TestValidator.predicate("updated_at is valid date-time", () =>
    typia.is<string & tags.Format<"date-time">>(refundRequest.updated_at),
  );
}
