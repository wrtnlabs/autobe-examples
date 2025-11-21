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
 * Comprehensive E2E test for shipment delivery status workflow progression.
 *
 * Validates the complete shipment lifecycle from label creation through final
 * delivery, ensuring proper status transitions, timestamp recording, and
 * business rule enforcement. Tests sequential progression through valid status
 * transitions and prevents invalid transitions to maintain workflow integrity.
 */
export async function test_api_shipment_update_delivery_status(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ shipment_management: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create order as customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://example.com/orders",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: "123 Main St, City, State 12345",
        billing_address: "123 Main St, City, State 12345",
        items: ArrayUtil.repeat(
          2,
          () =>
            ({
              shopping_mall_product_variant_id: typia.random<
                string & tags.Format<"uuid">
              >(),
              quantity: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
            }) satisfies IShoppingMallOrderItem.ICreate,
        ),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 4: Switch to admin and create shipment
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  const initialShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          carrier: "UPS",
          tracking_number: RandomGenerator.alphaNumeric(12),
          shipping_method: "ground",
          shipping_cost: 15.99,
          status: "label_created",
          estimated_delivery: new Date(Date.now() + 86400000 * 5).toISOString(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(initialShipment);
  TestValidator.equals(
    "initial status should be label_created",
    initialShipment.status,
    "label_created",
  );

  // Step 5: Test sequential status progression using valid status values
  const statusUpdates = [
    { status: "picked_up", description: "Carrier has picked up the package" },
    { status: "in_transit", description: "Package is in transit" },
    { status: "out_for_delivery", description: "Package is out for delivery" },
    { status: "delivered", description: "Package has been delivered" },
  ] as const;

  let currentShipment = initialShipment;

  for (const update of statusUpdates) {
    const updatedShipment =
      await api.functional.shoppingMall.admin.orders.shipments.update(
        connection,
        {
          orderId: order.id,
          shipmentId: currentShipment.id,
          body: {
            status: update.status,
            estimated_delivery:
              update.status === "in_transit"
                ? new Date(Date.now() + 86400000 * 3).toISOString()
                : undefined,
          } satisfies IShoppingMallShipment.IUpdate,
        },
      );
    typia.assert(updatedShipment);
    TestValidator.equals(
      `status should be ${update.status}`,
      updatedShipment.status,
      update.status,
    );

    currentShipment = updatedShipment;
  }

  // Step 6: Test that delivered shipments cannot revert status
  await TestValidator.error(
    "should not revert status from delivered",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.update(
        connection,
        {
          orderId: order.id,
          shipmentId: currentShipment.id,
          body: {
            status: "in_transit",
          } satisfies IShoppingMallShipment.IUpdate,
        },
      );
    },
  );

  // Step 7: Test that actual_delivery timestamp is properly set and immutable
  TestValidator.predicate(
    "delivered shipment should have actual_delivery timestamp",
    currentShipment.actual_delivery !== null &&
      currentShipment.actual_delivery !== undefined,
  );

  // Verify actual_delivery timestamp cannot be modified
  const originalDeliveryTime = currentShipment.actual_delivery;
  const finalShipment =
    await api.functional.shoppingMall.admin.orders.shipments.update(
      connection,
      {
        orderId: order.id,
        shipmentId: currentShipment.id,
        body: {
          actual_delivery: new Date().toISOString(),
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(finalShipment);

  TestValidator.equals(
    "actual_delivery timestamp should remain unchanged",
    finalShipment.actual_delivery,
    originalDeliveryTime,
  );

  // Step 8: Validate complete workflow integrity
  TestValidator.equals(
    "final shipment should maintain order reference",
    finalShipment.order.id,
    order.id,
  );
  TestValidator.predicate(
    "final shipment should have valid tracking information",
    finalShipment.tracking_number.length > 0,
  );
}
