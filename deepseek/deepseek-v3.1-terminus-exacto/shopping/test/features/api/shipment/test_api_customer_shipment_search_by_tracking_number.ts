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
 * Test customer shipment search functionality using tracking number filtering.
 *
 * This comprehensive E2E test validates the complete workflow of customer
 * shipment tracking in an e-commerce platform. The test follows a business flow
 * starting with customer registration, order creation, admin authentication for
 * shipment creation, and finally customer search for shipments using tracking
 * number filtering.
 *
 * The test ensures that customers can efficiently locate their shipments using
 * tracking information and that search results include relevant shipment
 * details for delivery monitoring, including carrier information, shipping
 * methods, costs, and delivery timelines.
 */
export async function test_api_customer_shipment_search_by_tracking_number(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Customer creates an order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, 123 Main St, City, State 12345`,
        billing_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, 123 Main St, City, State 12345`,
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

  // 3. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ manage_shipments: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // 4. Admin creates shipment with tracking number
  const trackingNumber = RandomGenerator.alphaNumeric(12);
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          carrier: "FedEx",
          tracking_number: trackingNumber,
          shipping_method: "standard",
          shipping_cost: 25.99,
          status: "in_transit",
          estimated_delivery: new Date(Date.now() + 86400000 * 3).toISOString(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // 5. Switch back to customer authentication
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://shoppingmall.example.com/track",
      referrer: "https://shoppingmall.example.com/orders",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Customer searches shipments using partial tracking number matching
  const partialTracking = trackingNumber.substring(0, 6); // First 6 characters
  const searchResults =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {
          search: partialTracking,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(searchResults);

  // 7. Validate search results
  TestValidator.equals(
    "search results should contain shipment",
    searchResults.data.length,
    1,
  );
  TestValidator.equals(
    "shipment ID should match",
    searchResults.data[0].id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking number should match",
    searchResults.data[0].tracking_number,
    trackingNumber,
  );
  TestValidator.equals(
    "carrier should match",
    searchResults.data[0].carrier,
    "FedEx",
  );
  TestValidator.equals(
    "shipping method should match",
    searchResults.data[0].shipping_method,
    "standard",
  );
  TestValidator.equals(
    "shipping cost should match",
    searchResults.data[0].shipping_cost,
    25.99,
  );
  TestValidator.equals(
    "status should match",
    searchResults.data[0].status,
    "in_transit",
  );

  // Validate pagination information
  TestValidator.equals(
    "pagination current page",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResults.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    searchResults.pagination.records,
    1,
  );
  TestValidator.equals("pagination pages", searchResults.pagination.pages, 1);

  // Test empty search (non-matching tracking number)
  const emptySearchResults =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {
          search: "NONEXISTENT123",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  TestValidator.equals(
    "empty search should return no results",
    emptySearchResults.data.length,
    0,
  );
}
