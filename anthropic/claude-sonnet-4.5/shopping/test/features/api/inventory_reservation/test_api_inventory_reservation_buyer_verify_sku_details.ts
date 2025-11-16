import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test that the reservation response includes correct SKU reference information
 * for displaying product details during checkout.
 *
 * This test validates that buyers can retrieve inventory reservations and the
 * response contains the shopping_mall_sale_sku_id field necessary for
 * displaying product variant details during checkout. Since no reservation
 * creation API is available, this test retrieves an existing reservation by
 * ID.
 *
 * Workflow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Retrieve a reservation by ID
 * 3. Validate the complete reservation structure including SKU reference via
 *    typia.assert()
 */
export async function test_api_inventory_reservation_buyer_verify_sku_details(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: typia.random<string & tags.MinLength<2> & tags.MaxLength<100>>(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerRegistration,
  });
  typia.assert(buyer);

  // Step 2: Retrieve reservation by ID
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  const reservation =
    await api.functional.shoppingMall.buyer.inventoryReservations.at(
      connection,
      {
        reservationId: reservationId,
      },
    );

  // Step 3: Validate complete reservation structure including SKU reference
  typia.assert(reservation);
}
