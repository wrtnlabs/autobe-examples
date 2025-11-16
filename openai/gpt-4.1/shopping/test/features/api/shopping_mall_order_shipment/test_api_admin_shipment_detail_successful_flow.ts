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
 * Validate the successful retrieval of order shipment details by an admin
 * actor.
 *
 * This test covers the full admin workflow:
 *
 * 1. Register (join) as a shopping mall admin and authenticate.
 * 2. (Assume order existence for testing—this shipment creation is for an existing
 *    order.)
 * 3. Create a shipment for that order using the admin endpoint.
 * 4. Retrieve shipment details for the created shipment by order number and
 *    shipment id.
 * 5. Validate that the response contains all expected shipment/metadata fields and
 *    is correctly linked to the parent order.
 * 6. Ensure all validation is performed via typia.assert, and the returned result
 *    matches creation.
 * 7. Confirm that the retrieved shipment matches the created shipment with
 *    business-level accuracy.
 */
export async function test_api_admin_shipment_detail_successful_flow(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminAuth);

  // 2. Simulate order context: create a random valid order summary (as real order creation API does not exist for this flow)
  // We'll use a random order summary object as if an order existed in the backend
  const orderSummary: IShoppingMallOrder.ISummary =
    typia.random<IShoppingMallOrder.ISummary>();
  typia.assert(orderSummary);

  // 3. Admin creates a shipment for the order
  const shipmentCreate = {
    shipping_partner_id: typia.random<string & tags.Format<"uuid">>(),
    tracking_number: RandomGenerator.alphaNumeric(18),
    status: RandomGenerator.pick([
      "pending",
      "shipped",
      "in_transit",
      "delivered",
      "returned",
    ] as const),
    ship_date: new Date().toISOString(),
    expected_delivery_date: new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IShoppingMallOrderShipment.ICreate;
  const shipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderNumber: orderSummary.order_number,
        body: shipmentCreate,
      },
    );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment order linkage",
    shipment.order.order_number,
    orderSummary.order_number,
  );
  TestValidator.equals(
    "tracking number",
    shipment.tracking_number,
    shipmentCreate.tracking_number,
  );
  TestValidator.predicate(
    "shipment has id",
    typeof shipment.id === "string" && shipment.id.length > 0,
  );

  // 4. Admin retrieves the just-created order shipment details
  const retrievedShipment =
    await api.functional.shoppingMall.admin.orders.shipments.at(connection, {
      orderNumber: orderSummary.order_number,
      shipmentId: shipment.id,
    });
  typia.assert(retrievedShipment);
  TestValidator.equals(
    "shipment detail should match creation",
    retrievedShipment,
    shipment,
    (key) => key === "created_at" || key === "updated_at",
  );
  TestValidator.equals(
    "retrieved shipment links to same order",
    retrievedShipment.order.order_number,
    orderSummary.order_number,
  );
}
