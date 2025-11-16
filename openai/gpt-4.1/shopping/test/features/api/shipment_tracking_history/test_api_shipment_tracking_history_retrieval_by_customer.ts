import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTrackingHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Shipment tracking history retrieval business validation scenario.
 *
 * Ensures that a customer can view tracking history for a shipment after the
 * admin has created the necessary entities (shipping partner and shipment). The
 * test mimics the following workflow:
 *
 * 1. Register a new admin and log in as admin
 * 2. Register a shipping partner as admin
 * 3. Register a new customer and log in as customer
 * 4. Admin creates a shipment for (mocked) order/order item belonging to the
 *    customer and assigns the registered shipping partner
 * 5. As the customer, call the tracking history API with the shipmentId to
 *    retrieve tracking history
 * 6. Confirm that all tracking records returned belong to the shipment and
 *    paging/filtering schema rules hold
 * 7. Attempt to retrieve tracking history for a shipment unrelated to the customer
 *    and expect an error (negative scenario)
 */
export async function test_api_shipment_tracking_history_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Admin account creation and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  // Switch to admin session explicitly (token already set by SDK)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Register a shipping partner as admin
  const partner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: RandomGenerator.name(2),
          partner_code: RandomGenerator.alphaNumeric(8),
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(partner);

  // Customer account creation and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(13);
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://test-shipment-tracking-history.customer/", // realistic test referrers
      referrer: "https://test-shipment-tracking-history.referrer/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Prepare fake order summary and order item summary for shipment creation since order flows are not available in test
  const orderSummary: IShoppingMallOrder.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: RandomGenerator.alphaNumeric(12),
    status: "pending",
    total_amount: 12345,
    currency: "USD",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const orderItemSummary: IShoppingMallOrderItem.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: orderSummary.id,
    sku: {
      id: typia.random<string & tags.Format<"uuid">>(),
      code: RandomGenerator.alphaNumeric(8),
      product_title: RandomGenerator.name(3),
      option_summary: RandomGenerator.name(2),
      in_stock: true,
    },
    quantity: 1,
    unit_price: 12345,
    subtotal: 12345,
    currency: "USD",
    delivered: false,
    refunded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Switch back to admin and create shipment for mocked order/item to simulate full flow
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const shipment = await api.functional.shoppingMall.admin.shipments.create(
    connection,
    {
      body: {
        order_id: orderSummary.id,
        order_item_id: orderItemSummary.id,
        shipping_partner_id: partner.id,
        carrier_tracking_code: RandomGenerator.alphaNumeric(16),
        status: "ready",
        manifest_url: null,
        provider_response_code: null,
        created_by_admin_id: admin.id,
        created_by_seller_id: undefined,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);

  // Switch back to customer, retrieve shipment tracking history with paging & filter
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://test-shipment-tracking-history.customer/", // keep same for realism
      referrer: "https://test-shipment-tracking-history.referrer/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Call shipment tracking history endpoint with valid shipmentId owned by customer
  const filterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallShipmentTrackingHistory.IRequest;
  const trackingPage =
    await api.functional.shoppingMall.customer.shipments.trackingHistories.index(
      connection,
      {
        shipmentId: shipment.id,
        body: filterBody,
      },
    );
  typia.assert(trackingPage);
  TestValidator.predicate(
    "all returned records have matching shipment_id",
    trackingPage.data.every((h) => h.shipment_id === shipment.id),
  );

  // Negative scenario: try with a random valid shipmentId (not associated with customer)
  const otherShipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "customer cannot access shipments not belonging to them",
    async () => {
      await api.functional.shoppingMall.customer.shipments.trackingHistories.index(
        connection,
        {
          shipmentId: otherShipmentId,
          body: filterBody,
        },
      );
    },
  );
}
