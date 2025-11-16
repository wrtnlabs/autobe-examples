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
 * Validate that an admin can successfully delete an order shipment.
 *
 * Steps:
 *
 * 1. Register a new admin account for authentication.
 * 2. Prepare a plausible order number for use in shipment creation.
 * 3. Create a shipment under the order number with valid properties.
 * 4. Delete the shipment by ID as admin.
 * 5. Assert deletion completion.
 * 6. Attempt to delete again and confirm business error is raised. Business rules
 *    for deletion of delivered/finalized shipments are noted in comments, but
 *    not directly tested due to lack of APIs.
 */
export async function test_api_order_shipment_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword satisfies string,
        name: adminName satisfies string,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Simulate a plausible order number (in real test, obtain from pre-created order or setup)
  const orderNumber = RandomGenerator.alphaNumeric(10);

  // 3. Create shipment
  const shipmentInput = {
    shipping_partner_id: typia.random<string & tags.Format<"uuid">>(),
    tracking_number: RandomGenerator.alphaNumeric(12),
    status: "pending",
    ship_date: new Date().toISOString(),
    expected_delivery_date: new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IShoppingMallOrderShipment.ICreate;
  const shipment: IShoppingMallOrderShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderNumber,
        body: shipmentInput,
      },
    );
  typia.assert(shipment);

  // 4. Delete shipment
  await api.functional.shoppingMall.admin.orders.shipments.erase(connection, {
    orderNumber,
    shipmentId: shipment.id,
  });

  // 5. Assert deletion by attempting to delete again and expect error
  await TestValidator.error(
    "Deleting an already-deleted shipment must fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.erase(
        connection,
        {
          orderNumber,
          shipmentId: shipment.id,
        },
      );
    },
  );

  // Note: Negative cases for delivered or finalized shipments are documented in business rules but not implemented due to lack of status-changing or financial event APIs.
}
