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
 * Test shipment pagination functionality for orders with multiple shipments.
 *
 * This comprehensive E2E test validates that customers can efficiently browse
 * through multiple shipments using page-based navigation with proper result
 * limiting. The test follows a complete business workflow including customer
 * registration, order creation, administrator setup, multiple shipment
 * creation, and pagination testing with different page sizes and limits.
 */
export async function test_api_customer_shipment_pagination_for_large_orders(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create an order for the customer
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.paragraph({ sentences: 2 })}`,
        billing_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.paragraph({ sentences: 2 })}`,
        items: ArrayUtil.repeat(
          3,
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

  // Step 3: Create and authenticate administrator
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

  // Step 4: Create multiple shipments for the order
  const carriers = ["UPS", "FedEx", "DHL", "USPS"] as const;
  const shippingMethods = ["standard", "express", "overnight"] as const;
  const statuses = [
    "label_created",
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
  ] as const;

  const createdShipments: IShoppingMallShipment[] = [];

  for (let i = 0; i < 15; i++) {
    const shipment =
      await api.functional.shoppingMall.admin.orders.shipments.create(
        connection,
        {
          orderId: order.id,
          body: {
            carrier: RandomGenerator.pick(carriers),
            tracking_number: `TRK${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000000> & tags.Maximum<9999999>>()}`,
            shipping_method: RandomGenerator.pick(shippingMethods),
            shipping_cost: typia.random<
              number & tags.Minimum<5> & tags.Maximum<50>
            >(),
            status: RandomGenerator.pick(statuses),
            estimated_delivery: new Date(
              Date.now() +
                typia.random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<86400000> &
                    tags.Maximum<604800000>
                >(),
            ).toISOString(),
            shipping_label_url: `https://example.com/labels/${typia.random<string & tags.Format<"uuid">>()}`,
            tracking_url: `https://tracking.example.com/${typia.random<string & tags.Format<"uuid">>()}`,
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
      href: "https://example.com/track",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 6: Test pagination with different page sizes

  // Test 1: Default pagination (first page with default limit)
  const firstPage =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(firstPage);

  TestValidator.equals(
    "first page should have data",
    firstPage.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    firstPage.pagination.current === 1 &&
      firstPage.pagination.limit > 0 &&
      firstPage.pagination.records >= createdShipments.length &&
      firstPage.pagination.pages >=
        Math.ceil(createdShipments.length / firstPage.pagination.limit),
  );

  // Test 2: Small page size (limit = 5)
  const smallPage =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(smallPage);

  TestValidator.equals(
    "small page should have exactly 5 items",
    smallPage.data.length,
    5,
  );
  TestValidator.predicate(
    "small page pagination should be correct",
    smallPage.pagination.limit === 5 &&
      smallPage.pagination.pages === Math.ceil(createdShipments.length / 5),
  );

  // Test 3: Large page size (limit = 20)
  const largePage =
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
  typia.assert(largePage);

  TestValidator.predicate(
    "large page should contain all or most shipments",
    largePage.data.length >= createdShipments.length ||
      largePage.data.length === largePage.pagination.limit,
  );

  // Test 4: Navigate to second page
  const secondPage =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page should have data",
    secondPage.data.length > 0,
    true,
  );
  TestValidator.equals(
    "second page should be page 2",
    secondPage.pagination.current,
    2,
  );

  // Test 5: Verify shipment data integrity
  const allShipmentsFromPages: IShoppingMallShipment.ISummary[] = [];

  // Collect all shipments from all pages
  for (let pageNum = 1; pageNum <= smallPage.pagination.pages; pageNum++) {
    const pageResult =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        connection,
        {
          orderId: order.id,
          body: {
            page: pageNum,
            limit: 5,
          } satisfies IShoppingMallShipment.IRequest,
        },
      );
    typia.assert(pageResult);
    allShipmentsFromPages.push(...pageResult.data);
  }

  // Verify we got all shipments
  TestValidator.equals(
    "should retrieve all created shipments",
    allShipmentsFromPages.length,
    Math.min(createdShipments.length, smallPage.pagination.records),
  );

  // Test 6: Filter by carrier
  const testCarrier = createdShipments[0]?.carrier;
  if (testCarrier) {
    const filteredPage =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        connection,
        {
          orderId: order.id,
          body: {
            page: 1,
            limit: 10,
            carrier: testCarrier,
          } satisfies IShoppingMallShipment.IRequest,
        },
      );
    typia.assert(filteredPage);

    TestValidator.predicate(
      "filtered page should only contain selected carrier",
      filteredPage.data.every((shipment) => shipment.carrier === testCarrier),
    );
  }

  // Test 7: Sort by creation date
  const sortedPage =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          direction: "desc",
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(sortedPage);

  // Verify sorting (most recent first)
  if (sortedPage.data.length > 1) {
    const dates = sortedPage.data.map((shipment) =>
      new Date(shipment.created_at).getTime(),
    );
    TestValidator.predicate(
      "shipments should be sorted by creation date descending",
      dates.every((date, index, arr) => index === 0 || date <= arr[index - 1]),
    );
  }

  // Final validation: Ensure pagination metadata consistency
  TestValidator.predicate(
    "total records should be consistent across pagination calls",
    firstPage.pagination.records === smallPage.pagination.records &&
      smallPage.pagination.records === largePage.pagination.records,
  );
}
