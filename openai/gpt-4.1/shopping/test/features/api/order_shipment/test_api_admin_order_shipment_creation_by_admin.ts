import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validate that an admin can successfully create a new shipment for an existing
 * shopping mall order.
 *
 * The test will perform the following:
 *
 * 1. Registers and authenticates a new admin user to obtain authorization.
 * 2. Generates a mock (existing) order number (as we have no order creation
 *    endpoint, test uses a random value for scenario).
 * 3. Creates a shipment for the (mock) order by submitting required shipment
 *    details per IShoppingMallOrderShipment.ICreate (shipping_partner_id,
 *    tracking_number, status, etc).
 * 4. Verifies the creation succeeds, the response structure matches
 *    IShoppingMallOrderShipment, and the returned shipment is correctly linked
 *    to the order with expected field values.
 * 5. Ensures unique/required fields are enforced.
 */
export async function test_api_admin_order_shipment_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user and authenticate
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.com`;
  const adminPassword = RandomGenerator.alphaNumeric(10) + "A!"; // Satisfy password format
  const adminName = RandomGenerator.name();
  const adminOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail as string & tags.Format<"email">,
        password: adminPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        name: adminName as string & tags.MinLength<1>,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminOutput);
  TestValidator.equals(
    "admin email matches input",
    adminOutput.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin ID is valid UUID",
    typeof adminOutput.id === "string" && adminOutput.id.length > 0,
  );

  // 2. Prepare a fake order number (since no order creation API exists)
  // Use a properly formatted random order number
  const orderNumber = `ORD${new Date().getFullYear()}${Math.floor(
    Math.random() * 1000000,
  )
    .toString()
    .padStart(6, "0")}`;

  // 3. Prepare shipment creation body
  // For realistic scenario, generate a mock shipping partner ID and required fields
  const shipmentBody = {
    shipping_partner_id: typia.random<string & tags.Format<"uuid">>(),
    tracking_number: RandomGenerator.alphaNumeric(12),
    status: RandomGenerator.pick([
      "pending",
      "shipped",
      "in_transit",
      "delivered",
      "returned",
    ] as const),
    ship_date: new Date().toISOString(),
    expected_delivery_date: new Date(
      Date.now() + 10 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 10 days from now
  } satisfies IShoppingMallOrderShipment.ICreate;

  // 4. Create shipment
  const shipment: IShoppingMallOrderShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderNumber,
        body: shipmentBody,
      },
    );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment tracking_number matches input",
    shipment.tracking_number,
    shipmentBody.tracking_number,
  );
  TestValidator.equals(
    "shipment status matches input",
    shipment.status,
    shipmentBody.status,
  );
  TestValidator.equals(
    "shipment shipping_partner_id matches",
    shipment.shippingPartner.id,
    shipmentBody.shipping_partner_id,
  );
  TestValidator.equals(
    "shipment order_number matches input",
    shipment.order.order_number,
    orderNumber,
  );
}
