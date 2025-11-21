import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validates administrator shipment creation workflow for customer orders. Tests
 * complete multi-actor authentication flow: customer registration → order
 * creation → admin authentication → shipment creation. Ensures proper
 * order-shipment relationship and carrier information integrity.
 */
export async function test_api_admin_shipment_creation_for_customer_order(
  connection: api.IConnection,
) {
  // Step 1: Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com/",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Customer login to establish session
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shoppingmall.example.com/orders",
      referrer: "https://shoppingmall.example.com/dashboard",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 3: Customer creates an order
  const orderItems = ArrayUtil.repeat(2, (index) => {
    return {
      shopping_mall_product_variant_id: typia.random<
        string & tags.Format<"uuid">
      >(),
      quantity: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    } satisfies IShoppingMallOrderItem.ICreate;
  });

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: "123 Main St, Anytown, CA 12345, USA",
        billing_address: "123 Main St, Anytown, CA 12345, USA",
        items: orderItems,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 4: Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        shipment_management: true,
        order_access: true,
      }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 5: Administrator login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.example.com/admin/shipments",
      referrer: "https://shoppingmall.example.com/admin/dashboard",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 6: Administrator creates shipment for the customer order
  const upsTrackingNumber = `1Z${RandomGenerator.alphaNumeric(3)}${RandomGenerator.alphaNumeric(3)}${RandomGenerator.alphaNumeric(2)}${RandomGenerator.alphaNumeric(8)}`;

  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          carrier: "UPS",
          tracking_number: upsTrackingNumber,
          shipping_method: "ground",
          shipping_cost: 12.5,
          status: "label_created",
          estimated_delivery: new Date(Date.now() + 86400000 * 3).toISOString(),
          shipping_label_url:
            "https://shipping.example.com/labels/order_12345.pdf",
          tracking_url: `https://www.ups.com/track?trackingNumber=${upsTrackingNumber}`,
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // Step 7: Validate shipment-relationship integrity
  TestValidator.equals(
    "shipment order ID matches created order",
    shipment.order.id,
    order.id,
  );
  TestValidator.equals("shipment carrier is UPS", shipment.carrier, "UPS");
  TestValidator.equals(
    "shipment shipping method is ground",
    shipment.shipping_method,
    "ground",
  );
  TestValidator.equals(
    "shipment cost is reasonable",
    shipment.shipping_cost,
    12.5,
  );
  TestValidator.predicate(
    "shipment has valid tracking number",
    shipment.tracking_number.length >= 10,
  );
  TestValidator.predicate(
    "shipment status is label_created",
    shipment.status === "label_created",
  );
  TestValidator.predicate(
    "shipment has estimated delivery date",
    shipment.estimated_delivery !== undefined,
  );
  TestValidator.predicate(
    "shipment tracking URL contains tracking number",
    shipment.tracking_url?.includes(shipment.tracking_number) ?? false,
  );

  // Validate order summary in shipment
  TestValidator.equals(
    "shipment order number matches",
    shipment.order.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "shipment order total amount matches",
    shipment.order.total_amount,
    order.total_amount,
  );
  TestValidator.equals(
    "shipment order status matches",
    shipment.order.status,
    order.status,
  );
}
