import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Test paginated, filterable customer retrieval of order shipment batches.
 *
 * 1. Register a new customer and log in to acquire JWT session.
 * 2. Register a new admin and log in to acquire admin session.
 * 3. Admin creates a shipping partner (required for shipments).
 * 4. Customer attempts retrieval for a random orderNumber (should yield empty
 *    list).
 * 5. Admin creates two shipments for a specific orderNumber and shipping partner
 *    (unique tracking numbers, different statuses).
 * 6. Customer retrieves shipments for the given orderNumber. Verifies:
 *
 *    - Only created shipments are returned
 *    - Pagination info is correct
 *    - Order filtering is enforced
 * 7. Tests search filtering by status, shipping partner, tracking number partial,
 *    invalid status.
 * 8. Edge case: retrieval using different orderNumber (should be empty)
 * 9. Verifies shipments not accessible to other customers
 */
export async function test_api_shopping_mall_order_shipments_customer_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  // Switch to admin session
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Create a shipping partner as admin
  const shippingPartner: IShoppingMallShippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: RandomGenerator.name(),
          partner_code: RandomGenerator.alphaNumeric(10),
          status: "active",
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(shippingPartner);

  // Simulate a business order number.
  const orderNumber = `ORD${RandomGenerator.alphaNumeric(10).toUpperCase()}`;
  // Customer tries to retrieve shipments for this order (should be empty)
  // Switch to customer session
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shop.example.com/my/orders", // Simulate a plausible URL
      referrer: "https://shop.example.com/dashboard",
      ip: "127.0.0.1", // Valid IPv4
    } satisfies IShoppingMallCustomer.ILogin,
  });

  let page: IPageIShoppingMallOrderShipment.ISummary =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderNumber,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderShipment.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "customer sees no shipments for non-existent order",
    page.data.length,
    0,
  );

  // Switch to admin session to create two shipments for the order
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const tracking1 = RandomGenerator.alphaNumeric(12);
  const tracking2 = RandomGenerator.alphaNumeric(12);
  const shipment1 =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderNumber,
        body: {
          shipping_partner_id: shippingPartner.id,
          tracking_number: tracking1,
          status: "pending",
          ship_date: new Date().toISOString(),
          expected_delivery_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IShoppingMallOrderShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  const shipment2 =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderNumber,
        body: {
          shipping_partner_id: shippingPartner.id,
          tracking_number: tracking2,
          status: "shipped",
          ship_date: new Date().toISOString(),
          expected_delivery_date: new Date(
            Date.now() + 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IShoppingMallOrderShipment.ICreate,
      },
    );
  typia.assert(shipment2);

  // Switch back to customer session and retrieve shipments
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shop.example.com/my/orders",
      referrer: "https://shop.example.com/dashboard",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Retrieve all shipments, expect both records
  page = await api.functional.shoppingMall.customer.orders.shipments.index(
    connection,
    {
      orderNumber,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderShipment.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "customer sees both shipments for their order",
    page.data.length,
    2,
  );
  TestValidator.equals("pagination current is 1", page.pagination.current, 1);
  TestValidator.equals("pagination limit is 10", page.pagination.limit, 10);
  TestValidator.predicate(
    "all results match orderNumber",
    page.data.every((x) => x.order.order_number === orderNumber),
  );
  // Test filtering by status=pending
  let filtered =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderNumber,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderShipment.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.equals(
    "filtering by status returns 1 result",
    filtered.data.length,
    1,
  );
  TestValidator.equals(
    "filtered result status is pending",
    filtered.data[0].status,
    "pending",
  );
  // Filtering by status=shipped
  filtered = await api.functional.shoppingMall.customer.orders.shipments.index(
    connection,
    {
      orderNumber,
      body: {
        status: "shipped",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderShipment.IRequest,
    },
  );
  typia.assert(filtered);
  TestValidator.equals(
    "filtering by shipped returns 1 result",
    filtered.data.length,
    1,
  );
  TestValidator.equals(
    "filtered result status is shipped",
    filtered.data[0].status,
    "shipped",
  );
  // Filtering by invalid status yields empty
  filtered = await api.functional.shoppingMall.customer.orders.shipments.index(
    connection,
    {
      orderNumber,
      body: {
        status: "returned",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderShipment.IRequest,
    },
  );
  typia.assert(filtered);
  TestValidator.equals(
    "filtering by non-existent status returns 0",
    filtered.data.length,
    0,
  );
  // Filtering by shipping partner
  filtered = await api.functional.shoppingMall.customer.orders.shipments.index(
    connection,
    {
      orderNumber,
      body: {
        shipping_partner_id: shippingPartner.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderShipment.IRequest,
    },
  );
  typia.assert(filtered);
  TestValidator.equals(
    "filtering by shipping partner returns 2",
    filtered.data.length,
    2,
  );
  // Filtering by partial tracking number (should only work for exact, so none)
  filtered = await api.functional.shoppingMall.customer.orders.shipments.index(
    connection,
    {
      orderNumber,
      body: {
        tracking_number: tracking1.slice(0, 6),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderShipment.IRequest,
    },
  );
  typia.assert(filtered);
  TestValidator.predicate(
    "tracking_number filtering yields at most 1 (could be exact only)",
    filtered.data.length <= 1,
  );

  // Edge: use a different order number, expect empty
  const otherOrderNumber = `ORD${RandomGenerator.alphaNumeric(10).toUpperCase()}`;
  const pageOther =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderNumber: otherOrderNumber,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderShipment.IRequest,
      },
    );
  typia.assert(pageOther);
  TestValidator.equals(
    "querying different order returns 0",
    pageOther.data.length,
    0,
  );
  // Create another customer, should not see these shipments
  const anotherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const anotherCustomerPassword = RandomGenerator.alphaNumeric(12);
  const anotherCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: anotherCustomerEmail,
      password: anotherCustomerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(anotherCustomer);
  await api.functional.auth.customer.login(connection, {
    body: {
      email: anotherCustomerEmail,
      password: anotherCustomerPassword,
      href: "https://shop.example.com/my/orders",
      referrer: "https://shop.example.com/dashboard",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const pageForOtherCustomer =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderNumber,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderShipment.IRequest,
      },
    );
  typia.assert(pageForOtherCustomer);
  TestValidator.equals(
    "other customer cannot see shipments of original customer",
    pageForOtherCustomer.data.length,
    0,
  );
}
