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
 * Test complete shipment deletion workflow for administrators.
 *
 * Validates that administrators can permanently delete shipment records
 * associated with customer orders. Tests the complete workflow from customer
 * registration through order creation, shipment creation, and final deletion.
 * Ensures proper authentication, authorization, and data integrity throughout
 * the process.
 */
export async function test_api_shipment_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shopping-mall.com/register",
      referrer: "https://shopping-mall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create an order as customer
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.name(1)} City, ST 12345`,
        billing_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.name(1)} City, ST 12345`,
        items: ArrayUtil.repeat(
          2,
          () =>
            ({
              shopping_mall_product_variant_id: typia.random<
                string & tags.Format<"uuid">
              >(),
              quantity: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
              >(),
            }) satisfies IShoppingMallOrderItem.ICreate,
        ),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 3. Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ shipment_management: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // 4. Create shipment record for the order
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          carrier: "UPS",
          tracking_number: RandomGenerator.alphaNumeric(12),
          shipping_method: "standard",
          shipping_cost: typia.random<
            number & tags.Minimum<5> & tags.Maximum<50>
          >(),
          status: "label_created",
          estimated_delivery: new Date(Date.now() + 86400000 * 3).toISOString(),
          shipping_label_url: "https://shipping-labels.com/label123.pdf",
          tracking_url:
            "https://tracking.ups.com/track?trackingNumber=123456789012",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // 5. Delete the shipment record
  await api.functional.shoppingMall.orders.shipments.erase(connection, {
    orderId: order.id,
    shipmentId: shipment.id,
  });

  // 6. Validate deletion by attempting to create a new shipment (should work)
  const newShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(12),
          shipping_method: "express",
          shipping_cost: typia.random<
            number & tags.Minimum<10> & tags.Maximum<100>
          >(),
          status: "label_created",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(newShipment);

  TestValidator.notEquals(
    "new shipment should have different ID",
    shipment.id,
    newShipment.id,
  );
  TestValidator.equals(
    "order ID should remain the same",
    order.id,
    newShipment.order.id,
  );
}
