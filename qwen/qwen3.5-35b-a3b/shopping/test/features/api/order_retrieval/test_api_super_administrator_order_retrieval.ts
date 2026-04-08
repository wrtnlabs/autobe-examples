import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_super_administrator_order_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IEcommerceMallSuperAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(customerConnection, {
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
  // 3. Create order with customer connection
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_member_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 4. Retrieve order as super administrator (platform-wide access)
  const retrievedOrder: IEcommerceMallOrder =
    await api.functional.ecommerceMall.superAdministrator.orders.at(
      adminConnection,
      {
        id: order.id,
      },
    );
  typia.assert(retrievedOrder);
  // 5. Validate order structure and data
  TestValidator.equals("order id", retrievedOrder.id, order.id);
  TestValidator.equals(
    "order_number",
    retrievedOrder.order_number,
    order.order_number,
  );
  TestValidator.equals("status", retrievedOrder.status, order.status);
  TestValidator.equals(
    "total_price",
    retrievedOrder.total_price,
    order.total_price,
  );
  // Validate deleted_at is null for active order
  TestValidator.equals("deleted_at is null", retrievedOrder.deleted_at, null);
  // Validate member information
  TestValidator.equals("member id", retrievedOrder.member.id, order.member.id);
  TestValidator.equals(
    "member email",
    retrievedOrder.member.email,
    order.member.email,
  );
  TestValidator.equals(
    "member display_name",
    retrievedOrder.member.display_name,
    order.member.display_name,
  );
  TestValidator.equals(
    "member phone_number",
    retrievedOrder.member.phone_number,
    order.member.phone_number,
  );
  TestValidator.equals(
    "member created_at",
    retrievedOrder.member.created_at,
    order.member.created_at,
  );
  TestValidator.equals(
    "member updated_at",
    retrievedOrder.member.updated_at,
    order.member.updated_at,
  );
  // Validate shipping address
  TestValidator.equals(
    "address id",
    retrievedOrder.shippingAddress.id,
    order.shippingAddress.id,
  );
  TestValidator.equals(
    "address recipient_name",
    retrievedOrder.shippingAddress.recipient_name,
    order.shippingAddress.recipient_name,
  );
  TestValidator.equals(
    "address phone",
    retrievedOrder.shippingAddress.phone,
    order.shippingAddress.phone,
  );
  TestValidator.equals(
    "address street",
    retrievedOrder.shippingAddress.street,
    order.shippingAddress.street,
  );
  TestValidator.equals(
    "address city",
    retrievedOrder.shippingAddress.city,
    order.shippingAddress.city,
  );
  TestValidator.equals(
    "address state",
    retrievedOrder.shippingAddress.state,
    order.shippingAddress.state,
  );
  TestValidator.equals(
    "address postal_code",
    retrievedOrder.shippingAddress.postal_code,
    order.shippingAddress.postal_code,
  );
  TestValidator.equals(
    "address country",
    retrievedOrder.shippingAddress.country,
    order.shippingAddress.country,
  );
  TestValidator.equals(
    "address is_default",
    retrievedOrder.shippingAddress.is_default,
    order.shippingAddress.is_default,
  );
  // Validate order items count and content
  TestValidator.equals(
    "items count",
    retrievedOrder.items.length,
    order.items.length,
  );
  for (let i = 0; i < order.items.length; i++) {
    const expectedItem = order.items[i];
    const actualItem = retrievedOrder.items[i];
    TestValidator.equals(`item ${i} id`, actualItem.id, expectedItem.id);
    TestValidator.equals(
      `item ${i} order_number`,
      actualItem.order_number,
      expectedItem.order_number,
    );
    TestValidator.equals(
      `item ${i} seller_display_name`,
      actualItem.seller_display_name,
      expectedItem.seller_display_name,
    );
    TestValidator.equals(
      `item ${i} product_variant_name`,
      actualItem.product_variant_name,
      expectedItem.product_variant_name,
    );
    TestValidator.equals(
      `item ${i} product_variant_sku_code`,
      actualItem.product_variant_sku_code,
      expectedItem.product_variant_sku_code,
    );
    TestValidator.equals(
      `item ${i} product_variant_price`,
      actualItem.product_variant_price,
      expectedItem.product_variant_price,
    );
    TestValidator.equals(
      `item ${i} quantity`,
      actualItem.quantity,
      expectedItem.quantity,
    );
    TestValidator.equals(
      `item ${i} unit_price`,
      actualItem.unit_price,
      expectedItem.unit_price,
    );
    TestValidator.equals(
      `item ${i} subtotal`,
      actualItem.subtotal,
      expectedItem.subtotal,
    );
    TestValidator.equals(
      `item ${i} status`,
      actualItem.status,
      expectedItem.status,
    );
  }
  // Validate shipments count and content
  TestValidator.equals(
    "shipments count",
    retrievedOrder.shipments.length,
    order.shipments.length,
  );
  for (let i = 0; i < order.shipments.length; i++) {
    const expectedShipment = order.shipments[i];
    const actualShipment = retrievedOrder.shipments[i];
    TestValidator.equals(
      `shipment ${i} id`,
      actualShipment.id,
      expectedShipment.id,
    );
    TestValidator.equals(
      `shipment ${i} status`,
      actualShipment.status,
      expectedShipment.status,
    );
    TestValidator.equals(
      `shipment ${i} carrier`,
      actualShipment.carrier,
      expectedShipment.carrier,
    );
    TestValidator.equals(
      `shipment ${i} tracking_number`,
      actualShipment.tracking_number,
      expectedShipment.tracking_number,
    );
    TestValidator.equals(
      `shipment ${i} created_at`,
      actualShipment.created_at,
      expectedShipment.created_at,
    );
  }
  // Validate total price equals sum of subtotals
  const calculatedTotal = order.items.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );
  TestValidator.equals(
    "total price equals sum of subtotals",
    retrievedOrder.total_price,
    calculatedTotal,
  );
}
