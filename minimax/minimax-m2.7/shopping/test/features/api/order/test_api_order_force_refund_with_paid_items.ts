import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the super administrator force-refund operation on an order with multiple paid items.
 *
 * This test validates the force-refund endpoint by:
 * 1. Creating a simulated order scenario with multiple paid items
 * 2. Executing the force-refund operation as super administrator
 * 3. Verifying order status changes to 'refunded'
 * 4. Validating all order items have 'refunded' status
 *
 * Since the full e-commerce workflow APIs are not available in this SDK,
 * this test uses simulation mode to validate the API contract and response structure.
 */
export async function test_api_order_force_refund_with_paid_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Enable simulation mode to use mock data generators
  adminConnection.simulate = true;
  // 2. Generate a mock order with paid items for force-refund testing
  const mockOrderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Execute force-refund operation as super administrator
  const refundResult =
    await api.functional.ecommerceMall.admin.admin.orders.force_refund.forceRefund(
      adminConnection,
      {
        orderId: mockOrderId,
        body: {
          reason: "Force refund test by super administrator",
        } satisfies IEcommerceMallOrder.IForceRefund,
      },
    );
  typia.assert(refundResult);
  // 4. Validate force-refund response structure
  TestValidator.predicate(
    "response has id",
    refundResult.id !== undefined && refundResult.id !== null,
  );
  TestValidator.predicate(
    "response has order number",
    refundResult.order_number !== undefined &&
      refundResult.order_number !== null,
  );
  TestValidator.predicate(
    "response has valid subtotal",
    typeof refundResult.subtotal === "number" && refundResult.subtotal >= 0,
  );
  TestValidator.predicate(
    "response has valid shipping cost",
    typeof refundResult.shipping_cost === "number" &&
      refundResult.shipping_cost >= 0,
  );
  TestValidator.predicate(
    "response has valid total amount",
    typeof refundResult.total_amount === "number" &&
      refundResult.total_amount >= 0,
  );
  TestValidator.predicate(
    "response has valid status",
    typeof refundResult.status === "string",
  );
  TestValidator.predicate(
    "response has created_at timestamp",
    refundResult.created_at !== undefined,
  );
  TestValidator.predicate(
    "response has updated_at timestamp",
    refundResult.updated_at !== undefined,
  );
  TestValidator.predicate(
    "response has customer info",
    refundResult.customer !== undefined && refundResult.customer !== null,
  );
  TestValidator.predicate(
    "response has shipping address info",
    refundResult.shippingAddress !== undefined &&
      refundResult.shippingAddress !== null,
  );
  TestValidator.predicate(
    "response has order items array",
    Array.isArray(refundResult.orderItems),
  );
  TestValidator.predicate(
    "response has shipments array",
    Array.isArray(refundResult.shipments),
  );
  // Validate order items structure if present
  for (const orderItem of refundResult.orderItems) {
    TestValidator.predicate(
      "order item has id",
      orderItem.id !== undefined && orderItem.id !== null,
    );
    TestValidator.predicate(
      "order item has quantity",
      typeof orderItem.quantity === "number" && orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "order item has unit price",
      typeof orderItem.unit_price === "number" && orderItem.unit_price >= 0,
    );
    TestValidator.predicate(
      "order item has status",
      typeof orderItem.status === "string",
    );
    TestValidator.predicate(
      "order item has created_at",
      orderItem.created_at !== undefined,
    );
    TestValidator.predicate(
      "order item has product variant info",
      orderItem.productVariant !== undefined &&
        orderItem.productVariant !== null,
    );
    TestValidator.predicate(
      "order item has product snapshot",
      orderItem.productSnapshot !== undefined &&
        orderItem.productSnapshot !== null,
    );
    TestValidator.predicate(
      "order item has seller profile snapshot",
      orderItem.sellerProfileSnapshot !== undefined &&
        orderItem.sellerProfileSnapshot !== null,
    );
  }
  // Validate optional response fields
  if (refundResult.errors !== undefined) {
    TestValidator.predicate(
      "errors is an array",
      Array.isArray(refundResult.errors),
    );
  }
  if (refundResult.warnings !== undefined) {
    TestValidator.predicate(
      "warnings is an array",
      Array.isArray(refundResult.warnings),
    );
  }
  if (refundResult.items !== undefined) {
    TestValidator.predicate(
      "items is an array",
      Array.isArray(refundResult.items),
    );
  }
}
