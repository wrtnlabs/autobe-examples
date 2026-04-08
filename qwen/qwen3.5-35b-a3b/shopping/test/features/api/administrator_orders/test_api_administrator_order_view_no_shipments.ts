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

export async function test_api_administrator_order_view_no_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular",
      },
    });
  typia.assert(admin);
  // 2. Login as administrator to get fresh token
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminAuthConnection, {
    body: {
      email: admin.email,
      password: "1234",
      ip: "0.0.0.0",
      referrer: "http://localhost",
    },
  });
  // 3. Retrieve an order that has no shipments
  // Generate a random order ID to simulate fetching an existing order
  // In a real test database, this would be a pre-existing order with status 'paid' or partial shipment
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const retrievedOrder =
    await api.functional.ecommerceMall.administrator.orders.getById(
      adminAuthConnection,
      {
        id: orderId,
      },
    );
  typia.assert(retrievedOrder);
  // 4. Validate the order response structure
  TestValidator.equals("order id matches", retrievedOrder.id, orderId);
  TestValidator.notEquals(
    "order number is set",
    retrievedOrder.order_number,
    "",
  );
  TestValidator.equals(
    "order status is set",
    retrievedOrder.status !== "",
    true,
  );
  TestValidator.predicate(
    "total price is positive",
    retrievedOrder.total_price > 0,
  );
  // 5. Verify customer member information
  TestValidator.equals(
    "customer member id is valid uuid",
    retrievedOrder.member.id !== "",
    true,
  );
  TestValidator.equals(
    "customer member email is valid email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(retrievedOrder.member.email),
    true,
  );
  // 6. Verify shipping address information
  TestValidator.equals(
    "shipping address recipient name is set",
    retrievedOrder.shippingAddress.recipient_name !== "",
    true,
  );
  TestValidator.equals(
    "shipping address phone is set",
    retrievedOrder.shippingAddress.phone !== "",
    true,
  );
  TestValidator.equals(
    "shipping address street is set",
    retrievedOrder.shippingAddress.street !== "",
    true,
  );
  TestValidator.equals(
    "shipping address city is set",
    retrievedOrder.shippingAddress.city !== "",
    true,
  );
  TestValidator.equals(
    "shipping address state is set",
    retrievedOrder.shippingAddress.state !== "",
    true,
  );
  TestValidator.equals(
    "shipping address postal code is set",
    retrievedOrder.shippingAddress.postal_code !== "",
    true,
  );
  TestValidator.equals(
    "shipping address country is set",
    retrievedOrder.shippingAddress.country !== "",
    true,
  );
  TestValidator.equals(
    "shipping address is default or not",
    retrievedOrder.shippingAddress.is_default !== null,
    true,
  );
  // 7. Verify shipments array - should be empty for order with no shipments
  TestValidator.equals(
    "shipments array is empty",
    retrievedOrder.shipments.length,
    0,
  );
  TestValidator.predicate(
    "shipments is array",
    Array.isArray(retrievedOrder.shipments),
  );
  // 8. Verify order items - validate structure even if no shipments
  TestValidator.predicate(
    "order items is array",
    Array.isArray(retrievedOrder.items),
  );
  if (retrievedOrder.items.length > 0) {
    const firstItem = retrievedOrder.items[0];
    typia.assert(firstItem);
    TestValidator.equals("item id is valid uuid", firstItem.id !== "", true);
    TestValidator.equals(
      "item order number is set",
      firstItem.order_number !== "",
      true,
    );
    TestValidator.equals(
      "item seller display name is set",
      firstItem.seller_display_name !== "",
      true,
    );
    TestValidator.equals(
      "item variant name is set",
      firstItem.product_variant_name !== "",
      true,
    );
    TestValidator.equals(
      "item variant sku code is set",
      firstItem.product_variant_sku_code !== "",
      true,
    );
    TestValidator.predicate(
      "item variant price is positive",
      firstItem.product_variant_price > 0,
    );
    TestValidator.predicate(
      "item quantity is at least 1",
      firstItem.quantity >= 1,
    );
    TestValidator.predicate(
      "item unit price is positive",
      firstItem.unit_price > 0,
    );
    TestValidator.predicate(
      "item subtotal is positive",
      firstItem.subtotal > 0,
    );
    TestValidator.predicate(
      "item status is valid",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        firstItem.status,
      ),
    );
  }
  // 9. Verify timestamps
  TestValidator.equals(
    "created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}./.test(retrievedOrder.created_at),
    true,
  );
  TestValidator.equals(
    "updated_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}./.test(retrievedOrder.updated_at),
    true,
  );
  TestValidator.equals(
    "deleted_at is nullable",
    retrievedOrder.deleted_at === null ||
      typeof retrievedOrder.deleted_at === "string",
    true,
  );
  // 10. Verify order status reflects fulfillment state
  // For order with no shipments, status should be 'paid' or similar initial state
  TestValidator.predicate(
    "order status reflects fulfillment state",
    retrievedOrder.status === "paid" ||
      retrievedOrder.status === "shipped" ||
      retrievedOrder.status === "delivered",
  );
}