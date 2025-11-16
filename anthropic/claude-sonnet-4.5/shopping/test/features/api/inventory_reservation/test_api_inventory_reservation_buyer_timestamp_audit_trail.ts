import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test that reservation timestamps provide complete audit trail for tracking
 * the reservation lifecycle.
 *
 * This test validates temporal tracking of reservation events by verifying that
 * both created_at and updated_at timestamps are present and properly related.
 * The test authenticates as a buyer and retrieves a reservation to validate the
 * timestamp audit trail.
 *
 * Note: This test uses a random reservation ID since no reservation creation
 * API is available. In a real scenario, the reservation would be created first
 * through the shopping flow.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Retrieve a reservation record using the reservation ID
 * 3. Validate timestamp relationship (updated_at >= created_at)
 */
export async function test_api_inventory_reservation_buyer_timestamp_audit_trail(
  connection: api.IConnection,
) {
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: typia.random<string & tags.MinLength<2> & tags.MaxLength<100>>(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  const reservationId = typia.random<string & tags.Format<"uuid">>();

  const reservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.buyer.inventoryReservations.at(
      connection,
      {
        reservationId: reservationId,
      },
    );
  typia.assert(reservation);

  const createdDate = new Date(reservation.created_at);
  const updatedDate = new Date(reservation.updated_at);

  TestValidator.predicate(
    "updated_at is greater than or equal to created_at",
    updatedDate.getTime() >= createdDate.getTime(),
  );
}
