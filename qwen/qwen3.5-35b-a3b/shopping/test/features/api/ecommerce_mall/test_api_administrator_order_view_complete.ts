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

export async function test_api_administrator_order_view_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. Create mock order through customer flow (using available SDK)
  // Since SDK doesn't have customer/order creation, we use random order for testing
  const order = typia.random<IEcommerceMallOrder>();
  // 3. Administrator retrieves order
  const retrievedOrder =
    await api.functional.ecommerceMall.administrator.orders.getById(
      adminAuthConnection,
      {
        id: order.id,
      },
    );
  typia.assert(retrievedOrder);
  // 4. Validate order metadata
  TestValidator.equals("order id", retrievedOrder.id, order.id);
  TestValidator.equals(
    "order number",
    retrievedOrder.order_number,
    order.order_number,
  );
  TestValidator.equals("order status", retrievedOrder.status, order.status);
  TestValidator.equals(
    "total price",
    retrievedOrder.total_price,
    order.total_price,
  );
  TestValidator.equals(
    "created at",
    retrievedOrder.created_at,
    order.created_at,
  );
  TestValidator.equals(
    "updated at",
    retrievedOrder.updated_at,
    order.updated_at,
  );
  TestValidator.equals("deleted at is null", retrievedOrder.deleted_at, null);
  // 5. Validate customer member summary
  TestValidator.equals(
    "customer id",
    retrievedOrder.member.id,
    order.member.id,
  );
  TestValidator.equals(
    "customer email",
    retrievedOrder.member.email,
    order.member.email,
  );
  TestValidator.equals(
    "customer display_name",
    retrievedOrder.member.display_name,
    order.member.display_name,
  );
  TestValidator.equals(
    "customer phone_number",
    retrievedOrder.member.phone_number,
    order.member.phone_number,
  );
  TestValidator.equals(
    "customer created_at",
    retrievedOrder.member.created_at,
    order.member.created_at,
  );
  TestValidator.equals(
    "customer updated_at",
    retrievedOrder.member.updated_at,
    order.member.updated_at,
  );
  TestValidator.equals(
    "customer deleted_at",
    retrievedOrder.member.deleted_at,
    order.member.deleted_at,
  );
  // 6. Validate shipping address
  TestValidator.equals(
    "shipping address id",
    retrievedOrder.shippingAddress.id,
    order.shippingAddress.id,
  );
  TestValidator.equals(
    "recipient name",
    retrievedOrder.shippingAddress.recipient_name,
    order.shippingAddress.recipient_name,
  );
  TestValidator.equals(
    "phone",
    retrievedOrder.shippingAddress.phone,
    order.shippingAddress.phone,
  );
  TestValidator.equals(
    "street",
    retrievedOrder.shippingAddress.street,
    order.shippingAddress.street,
  );
  TestValidator.equals(
    "city",
    retrievedOrder.shippingAddress.city,
    order.shippingAddress.city,
  );
  TestValidator.equals(
    "state",
    retrievedOrder.shippingAddress.state,
    order.shippingAddress.state,
  );
  TestValidator.equals(
    "postal_code",
    retrievedOrder.shippingAddress.postal_code,
    order.shippingAddress.postal_code,
  );
  TestValidator.equals(
    "country",
    retrievedOrder.shippingAddress.country,
    order.shippingAddress.country,
  );
  TestValidator.equals(
    "is_default",
    retrievedOrder.shippingAddress.is_default,
    order.shippingAddress.is_default,
  );
  TestValidator.equals(
    "address created_at",
    retrievedOrder.shippingAddress.created_at,
    order.shippingAddress.created_at,
  );
  TestValidator.equals(
    "address updated_at",
    retrievedOrder.shippingAddress.updated_at,
    order.shippingAddress.updated_at,
  );
  // 7. Validate order items
  TestValidator.equals(
    "items count",
    retrievedOrder.items.length,
    order.items.length,
  );
  if (retrievedOrder.items.length > 0) {
    const item = retrievedOrder.items[0];
    TestValidator.equals("item id", item.id, order.items[0].id);
    TestValidator.equals(
      "item order_number",
      item.order_number,
      order.items[0].order_number,
    );
    TestValidator.equals(
      "item seller_display_name",
      item.seller_display_name,
      order.items[0].seller_display_name,
    );
    TestValidator.equals(
      "item product_variant_name",
      item.product_variant_name,
      order.items[0].product_variant_name,
    );
    TestValidator.equals(
      "item product_variant_sku_code",
      item.product_variant_sku_code,
      order.items[0].product_variant_sku_code,
    );
    TestValidator.equals(
      "item product_variant_price",
      item.product_variant_price,
      order.items[0].product_variant_price,
    );
    TestValidator.equals(
      "item quantity",
      item.quantity,
      order.items[0].quantity,
    );
    TestValidator.equals(
      "item unit_price",
      item.unit_price,
      order.items[0].unit_price,
    );
    TestValidator.equals(
      "item subtotal",
      item.subtotal,
      order.items[0].subtotal,
    );
    TestValidator.equals("item status", item.status, order.items[0].status);
    TestValidator.equals(
      "item created_at",
      item.created_at,
      order.items[0].created_at,
    );
  }
  // 8. Validate shipments
  TestValidator.equals(
    "shipments count",
    retrievedOrder.shipments.length,
    order.shipments.length,
  );
  if (retrievedOrder.shipments.length > 0) {
    const shipment = retrievedOrder.shipments[0];
    TestValidator.equals("shipment id", shipment.id, order.shipments[0].id);
    TestValidator.equals(
      "shipment status",
      shipment.status,
      order.shipments[0].status,
    );
    TestValidator.equals(
      "shipment carrier",
      shipment.carrier,
      order.shipments[0].carrier,
    );
    TestValidator.equals(
      "shipment tracking_number",
      shipment.tracking_number,
      order.shipments[0].tracking_number,
    );
    TestValidator.equals(
      "shipment shipped_at",
      shipment.shipped_at,
      order.shipments[0].shipped_at,
    );
    TestValidator.equals(
      "shipment delivered_at",
      shipment.delivered_at,
      order.shipments[0].delivered_at,
    );
    TestValidator.equals(
      "shipment created_at",
      shipment.created_at,
      order.shipments[0].created_at,
    );
    TestValidator.equals(
      "shipment seller id",
      shipment.seller.id,
      order.shipments[0].seller.id,
    );
    TestValidator.equals(
      "shipment seller display_name",
      shipment.seller.display_name,
      order.shipments[0].seller.display_name,
    );
    TestValidator.equals(
      "shipment seller approval_status",
      shipment.seller.approval_status,
      order.shipments[0].seller.approval_status,
    );
    TestValidator.equals(
      "shipment seller is_suspended",
      shipment.seller.is_suspended,
      order.shipments[0].seller.is_suspended,
    );
    TestValidator.equals(
      "shipment seller created_at",
      shipment.seller.created_at,
      order.shipments[0].seller.created_at,
    );
  }
  // 9. Validate total price calculation
  const expectedTotal = retrievedOrder.items.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );
  TestValidator.equals(
    "total price equals sum of item subtotals",
    retrievedOrder.total_price,
    expectedTotal,
  );
}
