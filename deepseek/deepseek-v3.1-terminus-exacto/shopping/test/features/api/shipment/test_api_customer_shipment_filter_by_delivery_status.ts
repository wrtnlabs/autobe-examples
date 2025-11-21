import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Test customer shipment filtering by delivery status.
 *
 * Customer places an order, admin creates multiple shipments with different
 * statuses, then customer filters shipments by specific delivery status
 * (label_created, picked_up, in_transit, delivered). Validates that customers
 * can effectively monitor delivery progress by filtering shipments based on
 * current status and that the system provides accurate status-based
 * categorization for shipment management.
 */
export async function test_api_customer_shipment_filter_by_delivery_status(
  connection: api.IConnection,
) {
  // Step 1: Customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create customer order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: `${RandomGenerator.name(1)} ${RandomGenerator.alphabets(5)} Street, City, State 12345`,
        billing_address: `${RandomGenerator.name(1)} ${RandomGenerator.alphabets(5)} Street, City, State 12345`,
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

  // Step 3: Administrator registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_create_shipments: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Create multiple shipments with different statuses
  const shipmentStatuses = [
    "label_created",
    "picked_up",
    "in_transit",
    "delivered",
  ] as const;
  const createdShipments: IShoppingMallShipment[] = [];

  for (const status of shipmentStatuses) {
    const shipment =
      await api.functional.shoppingMall.admin.orders.shipments.create(
        connection,
        {
          orderId: order.id,
          body: {
            carrier: RandomGenerator.pick([
              "UPS",
              "FedEx",
              "USPS",
              "DHL",
            ] as const),
            tracking_number: RandomGenerator.alphaNumeric(12),
            shipping_method: RandomGenerator.pick([
              "standard",
              "express",
              "overnight",
            ] as const),
            shipping_cost: typia.random<
              number & tags.Minimum<5> & tags.Maximum<50>
            >(),
            status: status,
            estimated_delivery: new Date(
              Date.now() + 86400000 * 7,
            ).toISOString(),
            shipping_label_url: `https://shipping.com/labels/${RandomGenerator.alphaNumeric(10)}`,
            tracking_url: `https://tracking.com/${RandomGenerator.alphaNumeric(15)}`,
          } satisfies IShoppingMallShipment.ICreate,
        },
      );
    typia.assert(shipment);
    createdShipments.push(shipment);
  }

  // Step 5: Switch back to customer authentication
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shoppingmall.com/tracking",
      referrer: "https://shoppingmall.com/orders",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 6: Test filtering by each delivery status
  for (const status of shipmentStatuses) {
    const filteredShipments =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        connection,
        {
          orderId: order.id,
          body: {
            status: status,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallShipment.IRequest,
        },
      );
    typia.assert(filteredShipments);

    // Validate that all returned shipments have the requested status
    TestValidator.predicate(
      `filtered shipments should have status ${status}`,
      filteredShipments.data.every((shipment) => shipment.status === status),
    );

    // Validate pagination structure
    TestValidator.predicate(
      `pagination should be valid for status ${status}`,
      filteredShipments.pagination.current === 1 &&
        filteredShipments.pagination.limit === 10 &&
        filteredShipments.pagination.records >= 0 &&
        filteredShipments.pagination.pages >= 0,
    );

    // Count should match expected number of shipments with this status
    const expectedCount = createdShipments.filter(
      (s) => s.status === status,
    ).length;
    TestValidator.equals(
      `shipment count should match for status ${status}`,
      filteredShipments.data.length,
      expectedCount,
    );
  }

  // Step 7: Test without status filter (should return all shipments)
  const allShipments =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(allShipments);

  TestValidator.equals(
    "unfiltered request should return all shipments",
    allShipments.data.length,
    createdShipments.length,
  );

  // Step 8: Test search functionality with carrier filter
  const testCarrier = createdShipments[0].carrier;
  const carrierFiltered =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {
          carrier: testCarrier,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(carrierFiltered);

  TestValidator.predicate(
    `carrier filtered shipments should match ${testCarrier}`,
    carrierFiltered.data.every((shipment) => shipment.carrier === testCarrier),
  );
}
