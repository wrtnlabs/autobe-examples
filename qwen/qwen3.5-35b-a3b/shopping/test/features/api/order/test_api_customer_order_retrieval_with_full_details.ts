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

export async function test_api_customer_order_retrieval_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const joinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection for authenticated requests
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: customerAuth.token.access,
  };
  // 3. Create order via generate_random function
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 4. Retrieve order by UUID
  const retrievedOrder = await api.functional.ecommerceMall.member.orders.at(
    customerConnection,
    {
      id: order.id,
    },
  );
  typia.assert(retrievedOrder);
  // 5. Validate order metadata
  TestValidator.equals(
    "order number matches",
    order.order_number,
    retrievedOrder.order_number,
  );
  TestValidator.equals(
    "order status matches",
    order.status,
    retrievedOrder.status,
  );
  TestValidator.equals(
    "total price matches",
    order.total_price,
    retrievedOrder.total_price,
  );
  TestValidator.equals(
    "created at matches",
    order.created_at,
    retrievedOrder.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    order.updated_at,
    retrievedOrder.updated_at,
  );
  // 6. Validate customer information
  TestValidator.equals(
    "member id matches",
    order.member.id,
    retrievedOrder.member.id,
  );
  TestValidator.equals(
    "member email matches",
    order.member.email,
    retrievedOrder.member.email,
  );
  TestValidator.equals(
    "member display name matches",
    order.member.display_name,
    retrievedOrder.member.display_name,
  );
  TestValidator.equals(
    "member phone number matches",
    order.member.phone_number,
    retrievedOrder.member.phone_number,
  );
  TestValidator.equals(
    "member created at matches",
    order.member.created_at,
    retrievedOrder.member.created_at,
  );
  TestValidator.equals(
    "member updated at matches",
    order.member.updated_at,
    retrievedOrder.member.updated_at,
  );
  // 7. Validate shipping address
  TestValidator.equals(
    "address recipient name matches",
    order.shippingAddress.recipient_name,
    retrievedOrder.shippingAddress.recipient_name,
  );
  TestValidator.equals(
    "address phone matches",
    order.shippingAddress.phone,
    retrievedOrder.shippingAddress.phone,
  );
  TestValidator.equals(
    "address street matches",
    order.shippingAddress.street,
    retrievedOrder.shippingAddress.street,
  );
  TestValidator.equals(
    "address city matches",
    order.shippingAddress.city,
    retrievedOrder.shippingAddress.city,
  );
  TestValidator.equals(
    "address state matches",
    order.shippingAddress.state,
    retrievedOrder.shippingAddress.state,
  );
  TestValidator.equals(
    "address postal code matches",
    order.shippingAddress.postal_code,
    retrievedOrder.shippingAddress.postal_code,
  );
  TestValidator.equals(
    "address country matches",
    order.shippingAddress.country,
    retrievedOrder.shippingAddress.country,
  );
  TestValidator.equals(
    "address is_default matches",
    order.shippingAddress.is_default,
    retrievedOrder.shippingAddress.is_default,
  );
  TestValidator.equals(
    "address created at matches",
    order.shippingAddress.created_at,
    retrievedOrder.shippingAddress.created_at,
  );
  TestValidator.equals(
    "address updated at matches",
    order.shippingAddress.updated_at,
    retrievedOrder.shippingAddress.updated_at,
  );
  // 8. Validate order items
  TestValidator.equals(
    "order items count matches",
    order.items.length,
    retrievedOrder.items.length,
  );
  for (let i = 0; i < order.items.length; i++) {
    const expectedItem = order.items[i];
    const actualItem = retrievedOrder.items[i];
    TestValidator.equals(
      `order item ${i} id matches`,
      expectedItem.id,
      actualItem.id,
    );
    TestValidator.equals(
      `order item ${i} order number matches`,
      expectedItem.order_number,
      actualItem.order_number,
    );
    TestValidator.equals(
      `order item ${i} seller display name matches`,
      expectedItem.seller_display_name,
      actualItem.seller_display_name,
    );
    TestValidator.equals(
      `order item ${i} product variant name matches`,
      expectedItem.product_variant_name,
      actualItem.product_variant_name,
    );
    TestValidator.equals(
      `order item ${i} sku code matches`,
      expectedItem.product_variant_sku_code,
      actualItem.product_variant_sku_code,
    );
    TestValidator.equals(
      `order item ${i} quantity matches`,
      expectedItem.quantity,
      actualItem.quantity,
    );
    TestValidator.equals(
      `order item ${i} unit price matches`,
      expectedItem.unit_price,
      actualItem.unit_price,
    );
    TestValidator.equals(
      `order item ${i} subtotal matches`,
      expectedItem.subtotal,
      actualItem.subtotal,
    );
    TestValidator.equals(
      `order item ${i} status matches`,
      expectedItem.status,
      actualItem.status,
    );
    TestValidator.equals(
      `order item ${i} created at matches`,
      expectedItem.created_at,
      actualItem.created_at,
    );
  }
  // 9. Validate shipments
  TestValidator.equals(
    "shipments count matches",
    order.shipments.length,
    retrievedOrder.shipments.length,
  );
  for (let i = 0; i < order.shipments.length; i++) {
    const expectedShipment = order.shipments[i];
    const actualShipment = retrievedOrder.shipments[i];
    TestValidator.equals(
      `shipment ${i} id matches`,
      expectedShipment.id,
      actualShipment.id,
    );
    TestValidator.equals(
      `shipment ${i} status matches`,
      expectedShipment.status,
      actualShipment.status,
    );
    TestValidator.equals(
      `shipment ${i} created at matches`,
      expectedShipment.created_at,
      actualShipment.created_at,
    );
    TestValidator.equals(
      `shipment ${i} seller id matches`,
      expectedShipment.seller.id,
      actualShipment.seller.id,
    );
    TestValidator.equals(
      `shipment ${i} seller display name matches`,
      expectedShipment.seller.display_name,
      actualShipment.seller.display_name,
    );
    // Optional fields only if present
    if (expectedShipment.carrier !== undefined) {
      TestValidator.equals(
        `shipment ${i} carrier matches`,
        expectedShipment.carrier,
        actualShipment.carrier,
      );
    }
    if (expectedShipment.tracking_number !== undefined) {
      TestValidator.equals(
        `shipment ${i} tracking number matches`,
        expectedShipment.tracking_number,
        actualShipment.tracking_number,
      );
    }
    if (expectedShipment.shipped_at !== undefined) {
      TestValidator.equals(
        `shipment ${i} shipped at matches`,
        expectedShipment.shipped_at,
        actualShipment.shipped_at,
      );
    }
    if (expectedShipment.delivered_at !== undefined) {
      TestValidator.equals(
        `shipment ${i} delivered at matches`,
        expectedShipment.delivered_at,
        actualShipment.delivered_at,
      );
    }
  }
}
