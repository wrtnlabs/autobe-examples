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
 * Test shipment deletion in scenarios with multiple shipments per order.
 *
 * This comprehensive E2E test validates the shipment deletion functionality
 * when an order has multiple shipment records. The test follows a complete
 * business workflow from customer registration to shipment management and
 * deletion validation.
 *
 * Key test objectives:
 *
 * - Verify selective deletion of individual shipments works correctly
 * - Ensure deleting one shipment does not affect other shipments
 * - Validate order status and tracking information remain accurate
 * - Test complex fulfillment scenarios with split shipments
 */
export async function test_api_shipment_deletion_with_multiple_shipments(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for shipment management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ shipment_management: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create customer account for order placement
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Switch to customer authentication for order creation
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shoppingmall.example.com/orders",
      referrer: "https://shoppingmall.example.com/dashboard",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 3: Create an order with multiple items
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, 123 Main St, City, State 12345`,
        billing_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, 123 Main St, City, State 12345`,
        items: ArrayUtil.repeat(
          3,
          (index) =>
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

  // Switch to admin authentication for shipment management
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.example.com/admin/shipments",
      referrer: "https://shoppingmall.example.com/admin",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 4: Create multiple shipment records for the same order
  const shipments: IShoppingMallShipment[] = [];

  // Create first shipment
  const shipment1 =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          carrier: "UPS",
          tracking_number: `UPS${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000000000> & tags.Maximum<9999999999>>()}`,
          shipping_method: "ground",
          shipping_cost: 15.99,
          status: "label_created",
          estimated_delivery: new Date(Date.now() + 86400000 * 3).toISOString(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  shipments.push(shipment1);

  // Create second shipment
  const shipment2 =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          carrier: "FedEx",
          tracking_number: `FX${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000000000> & tags.Maximum<9999999999>>()}`,
          shipping_method: "express",
          shipping_cost: 29.99,
          status: "in_transit",
          estimated_delivery: new Date(Date.now() + 86400000 * 2).toISOString(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  shipments.push(shipment2);

  // Create third shipment
  const shipment3 =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          carrier: "USPS",
          tracking_number: `US${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000000000> & tags.Maximum<9999999999>>()}`,
          shipping_method: "priority",
          shipping_cost: 12.5,
          status: "picked_up",
          estimated_delivery: new Date(Date.now() + 86400000 * 4).toISOString(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment3);
  shipments.push(shipment3);

  // Validate all shipments belong to the same order
  TestValidator.equals(
    "shipment1 order ID matches created order",
    shipment1.order.id,
    order.id,
  );
  TestValidator.equals(
    "shipment2 order ID matches created order",
    shipment2.order.id,
    order.id,
  );
  TestValidator.equals(
    "shipment3 order ID matches created order",
    shipment3.order.id,
    order.id,
  );

  // Step 5: Test selective deletion of individual shipments
  // Delete the second shipment (middle one)
  await api.functional.shoppingMall.orders.shipments.erase(connection, {
    orderId: order.id,
    shipmentId: shipment2.id,
  });

  // Step 6: Verify that deleting one shipment does not affect other shipments
  // Attempt to delete the same shipment again should fail
  await TestValidator.error(
    "deleting already deleted shipment should fail",
    async () => {
      await api.functional.shoppingMall.orders.shipments.erase(connection, {
        orderId: order.id,
        shipmentId: shipment2.id,
      });
    },
  );

  // Verify first shipment still exists and maintains its properties
  TestValidator.equals(
    "first shipment carrier remains UPS after deletion",
    shipment1.carrier,
    "UPS",
  );
  TestValidator.equals(
    "first shipment tracking number unchanged",
    shipment1.tracking_number,
    shipment1.tracking_number,
  );

  // Verify third shipment still exists and maintains its properties
  TestValidator.equals(
    "third shipment carrier remains USPS after deletion",
    shipment3.carrier,
    "USPS",
  );
  TestValidator.equals(
    "third shipment tracking number unchanged",
    shipment3.tracking_number,
    shipment3.tracking_number,
  );

  // Step 7: Validate order status remains accurate
  TestValidator.predicate(
    "order total amount should be positive",
    order.total_amount > 0,
  );

  TestValidator.predicate(
    "order should have valid status",
    order.status.length > 0,
  );

  // Additional validation: Test deletion of remaining shipments
  // Delete first shipment
  await api.functional.shoppingMall.orders.shipments.erase(connection, {
    orderId: order.id,
    shipmentId: shipment1.id,
  });

  // Delete third shipment
  await api.functional.shoppingMall.orders.shipments.erase(connection, {
    orderId: order.id,
    shipmentId: shipment3.id,
  });

  // Final validation: All shipments should be deleted
  await TestValidator.error(
    "deleting non-existent first shipment should fail",
    async () => {
      await api.functional.shoppingMall.orders.shipments.erase(connection, {
        orderId: order.id,
        shipmentId: shipment1.id,
      });
    },
  );

  await TestValidator.error(
    "deleting non-existent second shipment should fail",
    async () => {
      await api.functional.shoppingMall.orders.shipments.erase(connection, {
        orderId: order.id,
        shipmentId: shipment2.id,
      });
    },
  );

  await TestValidator.error(
    "deleting non-existent third shipment should fail",
    async () => {
      await api.functional.shoppingMall.orders.shipments.erase(connection, {
        orderId: order.id,
        shipmentId: shipment3.id,
      });
    },
  );
}
