import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Test that a customer can retrieve shipment detail for their order and
 * validates access and fields.
 *
 * 1. Register customer (with real info)
 * 2. Register seller and admin
 * 3. Admin: Register shipping partner
 * 4. Customer: (mock address summary)
 * 5. Customer: Create order (reference self & address & seller)
 * 6. Seller: Create shipment for customer order, referencing shipping partner
 * 7. Customer: Retrieve shipment by orderNumber+shipmentId, confirm correct
 *    fields/associations
 * 8. Unauthorized: Create another customer, try access (should fail)
 * 9. Customer: Fails with invalid shipmentId/orderNumber (should fail)
 */
export async function test_api_order_shipment_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // (1) Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "abcABC12$";
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // (2) Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Seller888!";
  const sellerHref = "https://seller.mall/join";
  const sellerRef = "https://mall.com/";
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      registration_number: RandomGenerator.alphaNumeric(8),
      business_phone: RandomGenerator.mobile(),
      href: sellerHref,
      referrer: sellerRef,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // (3) Register admin and create shipping partner
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  // Login as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Register shipping partner
  const shippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: RandomGenerator.paragraph({ sentences: 2 }),
          partner_code: RandomGenerator.alphaNumeric(8),
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(shippingPartner);

  // Switch back to customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://customer.mall/orders",
      referrer: "https://search.mall.com/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // (4) Create a mock address summary (simulate address DB record, shortcut)
  // (address summary is not created via an API in the available SDK)
  const addressSummary: IShoppingMallAddress.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    full_name: RandomGenerator.name(),
    street: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "TestLand",
    phone: RandomGenerator.mobile(),
    is_default: true,
  };

  // (5) Create order for customer
  const orderNumber = RandomGenerator.alphaNumeric(12);
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        order_number: orderNumber,
        shopping_mall_customer_id: customer.id,
        shopping_mall_address_id: addressSummary.id,
        shopping_mall_seller_id: seller.id,
        status: "pending",
        total_amount: 10000,
        currency: "USD",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // (6) Login as seller to create shipment for order
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerRef,
    } satisfies IShoppingMallSeller.ILogin,
  });
  const trackingNumber = RandomGenerator.alphaNumeric(13);
  const shipDate = new Date().toISOString();
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      connection,
      {
        orderNumber: orderNumber,
        body: {
          shipping_partner_id: shippingPartner.id,
          tracking_number: trackingNumber,
          status: "shipped",
          ship_date: shipDate,
          expected_delivery_date: null,
        } satisfies IShoppingMallOrderShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // (7) Login as customer to retrieve shipment detail
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://customer.mall/orders",
      referrer: "https://search.mall.com/",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const retrieved =
    await api.functional.shoppingMall.customer.orders.shipments.at(connection, {
      orderNumber: orderNumber,
      shipmentId: shipment.id,
    });
  typia.assert(retrieved);

  TestValidator.equals(
    "retrieved shipment should match created shipment id",
    retrieved.id,
    shipment.id,
  );
  TestValidator.equals(
    "retrieved shipment order number should match order number",
    retrieved.order.order_number,
    orderNumber,
  );
  TestValidator.equals(
    "retrieved shipment tracking number correct",
    retrieved.tracking_number,
    trackingNumber,
  );
  TestValidator.equals(
    "shipping partner association",
    retrieved.shippingPartner.id,
    shippingPartner.id,
  );
  TestValidator.equals("shipment status", retrieved.status, "shipped");
  TestValidator.equals("shipment ship_date", retrieved.ship_date, shipDate);

  // (8) Create another customer, try to access the shipment (should fail)
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2Password = "otherCust$12";
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer2Email,
      password: customer2Password,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer2);
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customer2Email,
      password: customer2Password,
      href: "https://customer2.mall/orders",
      referrer: "https://login.customer2.com/",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  await TestValidator.error(
    "unauthorized customer cannot access other customer's shipment",
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.at(
        connection,
        {
          orderNumber: orderNumber,
          shipmentId: shipment.id,
        },
      );
    },
  );

  // (9) Original customer tries to fetch with invalid shipmentId
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://customer.mall/orders",
      referrer: "https://search.mall.com/",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  await TestValidator.error(
    "fetching with invalid shipment id should fail",
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.at(
        connection,
        {
          orderNumber: orderNumber,
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Also test with an invalid order number
  await TestValidator.error(
    "fetching with wrong order number should fail",
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.at(
        connection,
        {
          orderNumber: RandomGenerator.alphaNumeric(12),
          shipmentId: shipment.id,
        },
      );
    },
  );
}
