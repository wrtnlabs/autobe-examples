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

export async function test_api_super_administrator_order_multiple_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create order with multiple items
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_member_orders_create(
      customerConnection,
      {
        body: {
          // Note: generate_random function will fill shipping_address_id and order_items
        },
      },
    );
  typia.assert(order);
  // 4. Verify order has multiple items
  TestValidator.predicate("order has multiple items", order.items.length >= 2);
  // 5. Retrieve order via super administrator
  const retrievedOrder: IEcommerceMallOrder =
    await api.functional.ecommerceMall.superAdministrator.orders.at(
      adminConnection,
      { id: order.id },
    );
  typia.assert(retrievedOrder);
  // 6. Validate order entity
  TestValidator.equals("order id matches", retrievedOrder.id, order.id);
  TestValidator.equals(
    "order number matches",
    retrievedOrder.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "total price matches",
    retrievedOrder.total_price,
    order.total_price,
  );
  // 7. Validate items count
  TestValidator.equals(
    "items count matches",
    retrievedOrder.items.length,
    order.items.length,
  );
  // 8. Validate each order item has required fields
  for (const item of retrievedOrder.items) {
    typia.assert(item);
    // Check seller information is present
    TestValidator.predicate(
      "item has seller_display_name",
      item.seller_display_name.length > 0,
    );
    // Check product variant information
    TestValidator.predicate(
      "item has product_variant_name",
      item.product_variant_name.length > 0,
    );
    TestValidator.predicate(
      "item has product_variant_sku_code",
      item.product_variant_sku_code.length > 0,
    );
    TestValidator.predicate(
      "item has product_variant_price",
      item.product_variant_price > 0,
    );
    // Validate calculation: subtotal = quantity × unit_price
    TestValidator.equals(
      "item subtotal calculation",
      item.subtotal,
      item.quantity * item.unit_price,
    );
    // Check timestamps
    TestValidator.predicate(
      "item has valid created_at",
      item.created_at !== undefined,
    );
  }
  // 9. Validate shipments
  TestValidator.equals(
    "shipments count matches",
    retrievedOrder.shipments.length,
    order.shipments.length,
  );
  for (const shipment of retrievedOrder.shipments) {
    typia.assert(shipment);
    // Check seller information in shipment
    TestValidator.predicate(
      "shipment has seller",
      shipment.seller.id !== undefined,
    );
    TestValidator.predicate(
      "shipment has seller_display_name",
      shipment.seller.display_name.length > 0,
    );
    // Check shipment identifiers
    TestValidator.predicate("shipment has id", shipment.id !== undefined);
    // Check status
    TestValidator.predicate(
      "shipment has valid status",
      ["shipped", "delivered"].includes(shipment.status),
    );
    // Check carrier and tracking_number are optional but present if shipped
    if (shipment.status === "shipped") {
      TestValidator.predicate(
        "shipped shipment has carrier or tracking",
        shipment.carrier !== undefined ||
          shipment.tracking_number !== undefined,
      );
    }
    // Check timestamps
    TestValidator.predicate(
      "shipment has valid created_at",
      shipment.created_at !== undefined,
    );
  }
  // 10. Validate customer member information
  TestValidator.predicate(
    "member has valid email",
    retrievedOrder.member.email.length > 0,
  );
  TestValidator.predicate(
    "member has valid display_name or null",
    retrievedOrder.member.display_name === null ||
      retrievedOrder.member.display_name.length > 0,
  );
  // 11. Validate shipping address
  TestValidator.predicate(
    "address has recipient_name",
    retrievedOrder.shippingAddress.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "address has valid street",
    retrievedOrder.shippingAddress.street.length > 0,
  );
  TestValidator.predicate(
    "address has is_default",
    typeof retrievedOrder.shippingAddress.is_default === "boolean",
  );
  // 12. Validate timestamps are ISO 8601 format
  TestValidator.predicate(
    "order created_at is valid ISO 8601",
    !isNaN(Date.parse(retrievedOrder.created_at)),
  );
  TestValidator.predicate(
    "order updated_at is valid ISO 8601",
    !isNaN(Date.parse(retrievedOrder.updated_at)),
  );
  // 13. Validate deleted_at is null for active order
  TestValidator.equals(
    "order is active (not deleted)",
    retrievedOrder.deleted_at,
    null,
  );
  // 14. Validate relationship integrity across all items
  const allItemSellers = retrievedOrder.items.map(
    (item) => item.seller_display_name,
  );
  const allItemProductNames = retrievedOrder.items.map(
    (item) => item.product_variant_name,
  );
  // Ensure all items have seller information
  for (const sellerName of allItemSellers) {
    TestValidator.predicate("seller is present", sellerName.length > 0);
  }
  // Ensure all items have product variant information
  for (const productName of allItemProductNames) {
    TestValidator.predicate(
      "product variant is present",
      productName.length > 0,
    );
  }
}
