import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_member_order_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(memberData);
  // 2. Create authenticated connection for member
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberData.access}` },
  };
  // 3. Generate random order creation data
  // Note: This requires the member to have addresses and cart items pre-populated
  // The order creation validates that shipping_address_id belongs to the member
  const orderData: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_member_orders_create(
      authenticatedConnection,
      {
        body: typia.random<IEcommerceMallOrder.ICreate>(),
      },
    );
  typia.assert(orderData);
  // 4. Validate order number format (ORD-{YYYYMMDD}-{sequence})
  TestValidator.predicate(
    "order number format",
    /^ORD-\d{8}-\d{6}$/.test(orderData.order_number),
  );
  // 5. Validate initial fulfillment status
  TestValidator.equals("initial status paid", orderData.status, "paid");
  // 6. Validate total price calculation
  TestValidator.predicate("total price positive", orderData.total_price > 0);
  // 7. Validate all order items
  for (const item of orderData.items) {
    TestValidator.equals(
      `item status paid (item ${item.id})`,
      item.status,
      "paid",
    );
    TestValidator.predicate(
      `unit price positive (item ${item.id})`,
      item.unit_price > 0,
    );
    TestValidator.predicate(
      `subtotal positive (item ${item.id})`,
      item.subtotal > 0,
    );
    TestValidator.equals(
      `subtotal matches unit_price * quantity (item ${item.id})`,
      item.subtotal,
      item.unit_price * item.quantity,
    );
  }
  // 8. Validate shipping address exists and has required fields
  TestValidator.equals(
    "shipping address exists",
    orderData.shippingAddress !== undefined,
    true,
  );
  TestValidator.equals(
    "shipping address has recipient",
    orderData.shippingAddress.recipient_name !== undefined,
    true,
  );
  // 9. Validate member association
  TestValidator.equals(
    "member email matches",
    orderData.member.email,
    memberData.email,
  );
  // 10. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date",
    !Number.isNaN(new Date(orderData.created_at).getTime()),
  );
  TestValidator.equals(
    "updated_at equals created_at for new order",
    orderData.updated_at,
    orderData.created_at,
  );
  // 11. Validate items have required fields
  for (const item of orderData.items) {
    TestValidator.equals(
      `item has order_number (item ${item.id})`,
      item.order_number,
      orderData.order_number,
    );
    TestValidator.equals(
      `item has seller_display_name (item ${item.id})`,
      item.seller_display_name !== "",
      true,
    );
    TestValidator.equals(
      `item has product_variant_name (item ${item.id})`,
      item.product_variant_name !== "",
      true,
    );
    TestValidator.equals(
      `item has sku_code (item ${item.id})`,
      item.product_variant_sku_code !== "",
      true,
    );
  }
  // 12. Validate shipment array exists (empty for paid status)
  TestValidator.equals(
    "shipments array exists",
    Array.isArray(orderData.shipments),
    true,
  );
}
