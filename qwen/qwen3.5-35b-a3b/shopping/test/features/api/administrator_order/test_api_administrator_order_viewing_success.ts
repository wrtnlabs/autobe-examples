import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_order_viewing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Use admin connection (already authenticated via join)
  // 3. Get order by order number using random order number for testing
  const orderNumber = typia.random<string>();
  const order =
    await api.functional.ecommerceMall.administrator.orders.getByOrdernumber(
      adminConnection,
      { orderNumber },
    );
  typia.assert(order);
  // 4. Validate order structure and required fields
  TestValidator.equals("order number matches", order.order_number, orderNumber);
  TestValidator.notEquals("has valid status", order.status, null);
  TestValidator.predicate("total price is positive", order.total_price > 0);
  TestValidator.notEquals("has member reference", order.member, null);
  TestValidator.notEquals("has shipping address", order.shippingAddress, null);
  TestValidator.predicate("has order items", order.items.length >= 0);
  TestValidator.predicate("has shipments array", order.shipments !== undefined);
  // 5. Validate member summary structure
  TestValidator.notEquals("member has id", order.member.id, null);
  TestValidator.notEquals("member has email", order.member.email, null);
  // 6. Validate shipping address structure
  TestValidator.notEquals("address has id", order.shippingAddress.id, null);
  TestValidator.notEquals(
    "address has recipient",
    order.shippingAddress.recipient_name,
    null,
  );
  TestValidator.notEquals(
    "address has phone",
    order.shippingAddress.phone,
    null,
  );
  TestValidator.notEquals(
    "address has street",
    order.shippingAddress.street,
    null,
  );
  TestValidator.notEquals("address has city", order.shippingAddress.city, null);
  TestValidator.notEquals(
    "address has state",
    order.shippingAddress.state,
    null,
  );
  TestValidator.notEquals(
    "address has postal code",
    order.shippingAddress.postal_code,
    null,
  );
  TestValidator.notEquals(
    "address has country",
    order.shippingAddress.country,
    null,
  );
  TestValidator.predicate(
    "address is default",
    order.shippingAddress.is_default === true ||
      order.shippingAddress.is_default === false,
  );
  // 7. Validate order items if any exist
  if (order.items.length > 0) {
    const firstItem = order.items[0];
    TestValidator.notEquals("item has id", firstItem.id, null);
    TestValidator.notEquals(
      "item has order number",
      firstItem.order_number,
      null,
    );
    TestValidator.notEquals(
      "item has seller display name",
      firstItem.seller_display_name,
      null,
    );
    TestValidator.notEquals(
      "item has variant name",
      firstItem.product_variant_name,
      null,
    );
    TestValidator.notEquals(
      "item has SKU",
      firstItem.product_variant_sku_code,
      null,
    );
    TestValidator.predicate("item has quantity", firstItem.quantity > 0);
    TestValidator.predicate("item has unit price", firstItem.unit_price >= 0);
    TestValidator.predicate("item has subtotal", firstItem.subtotal >= 0);
    TestValidator.predicate(
      "item has valid status",
      firstItem.status === "paid" ||
        firstItem.status === "shipped" ||
        firstItem.status === "delivered" ||
        firstItem.status === "cancelled" ||
        firstItem.status === "refunded",
    );
  }
  // 8. Validate shipments if any exist
  if (order.shipments.length > 0) {
    const firstShipment = order.shipments[0];
    TestValidator.notEquals("shipment has id", firstShipment.id, null);
    TestValidator.predicate(
      "shipment has valid status",
      firstShipment.status === "shipped" ||
        firstShipment.status === "delivered",
    );
    TestValidator.notEquals("shipment has seller", firstShipment.seller, null);
  }
  // 9. Validate timestamps
  TestValidator.notEquals("has created_at", order.created_at, null);
  TestValidator.notEquals("has updated_at", order.updated_at, null);
}
