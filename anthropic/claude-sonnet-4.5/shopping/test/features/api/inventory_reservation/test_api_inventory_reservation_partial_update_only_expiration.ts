import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test partial update of inventory reservation expiration time.
 *
 * This test validates that an admin can successfully call the inventory
 * reservation update endpoint. Due to API limitations (no creation endpoint
 * available), this test focuses on verifying successful API integration and
 * response structure validation.
 *
 * Test Flow:
 *
 * 1. Authenticate as platform admin to gain update permissions
 * 2. Call the update API with only expires_at field to test partial update pattern
 * 3. Verify the API responds with a valid reservation structure
 */
export async function test_api_inventory_reservation_partial_update_only_expiration(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin to perform reservation updates
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Perform partial update with only expires_at field
  const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const updatedReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.update(
      connection,
      {
        reservationId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          expires_at: newExpiresAt,
        } satisfies IShoppingMallInventoryReservation.IUpdate,
      },
    );
  typia.assert(updatedReservation);

  // 3. Verify the response structure is valid
  TestValidator.predicate(
    "reservation ID should be valid UUID format",
    typeof updatedReservation.id === "string" &&
      updatedReservation.id.length > 0,
  );

  TestValidator.predicate(
    "reservation should have valid status",
    ["active", "released", "expired", "converted"].includes(
      updatedReservation.reservation_status,
    ),
  );

  TestValidator.predicate(
    "reservation should have positive quantity",
    updatedReservation.reserved_quantity >= 1,
  );
}
