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
 * Test updating shipment tracking URLs including shipping label URL generation
 * and carrier tracking URL assignment. Validates that administrators can update
 * tracking information for enhanced customer visibility and carrier
 * integration. The scenario covers label URL generation for printing, tracking
 * URL assignment for real-time monitoring, and URL format validation. Business
 * logic ensures secure URL access, proper carrier redirection, and integration
 * with carrier APIs for automated tracking updates.
 */
export async function test_api_shipment_update_tracking_urls(
  connection: api.IConnection,
) {
  // 1. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "password123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create an order as the customer
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: "123 Main St, Anytown, USA 12345",
        billing_address: "123 Main St, Anytown, USA 12345",
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

  // 3. Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ can_manage_shipments: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // 4. Create a shipment for the order
  const trackingNumber = "1Z" + RandomGenerator.alphaNumeric(14);
  const initialShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          carrier: "UPS",
          tracking_number: trackingNumber,
          shipping_method: "ground",
          shipping_cost: 15.99,
          status: "label_created",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(initialShipment);

  // 5. Update the shipment with tracking URLs
  const updatedShipment =
    await api.functional.shoppingMall.admin.orders.shipments.update(
      connection,
      {
        orderId: order.id,
        shipmentId: initialShipment.id,
        body: {
          carrier: "UPS",
          tracking_number: trackingNumber,
          shipping_method: "ground",
          shipping_cost: 15.99,
          status: "in_transit",
          shipping_label_url:
            "https://shipping.example.com/labels/" +
            RandomGenerator.alphaNumeric(10) +
            ".pdf",
          tracking_url:
            "https://www.ups.com/track?trackingNumber=" + trackingNumber,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);

  // 6. Validate the updated shipment information
  TestValidator.equals(
    "shipment ID remains unchanged",
    updatedShipment.id,
    initialShipment.id,
  );
  TestValidator.equals(
    "order ID remains unchanged",
    updatedShipment.order.id,
    order.id,
  );
  TestValidator.equals(
    "tracking number remains unchanged",
    updatedShipment.tracking_number,
    trackingNumber,
  );
  TestValidator.equals(
    "status updated to in_transit",
    updatedShipment.status,
    "in_transit",
  );
  TestValidator.predicate(
    "shipping label URL is provided",
    updatedShipment.shipping_label_url !== undefined,
  );
  TestValidator.predicate(
    "tracking URL is provided",
    updatedShipment.tracking_url !== undefined,
  );

  // Enhanced URL validation
  if (updatedShipment.shipping_label_url) {
    TestValidator.predicate(
      "shipping label URL follows URI format",
      updatedShipment.shipping_label_url.startsWith("https://") &&
        updatedShipment.shipping_label_url.includes("."),
    );
  }

  if (updatedShipment.tracking_url) {
    TestValidator.predicate(
      "tracking URL follows URI format",
      updatedShipment.tracking_url.startsWith("https://") &&
        updatedShipment.tracking_url.includes("."),
    );
    TestValidator.predicate(
      "tracking URL contains tracking number",
      updatedShipment.tracking_url.includes(trackingNumber),
    );
  }
}
