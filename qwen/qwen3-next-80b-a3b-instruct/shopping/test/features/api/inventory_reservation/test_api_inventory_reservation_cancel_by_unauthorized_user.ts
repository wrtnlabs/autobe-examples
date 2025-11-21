import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_inventory_reservation_cancel_by_unauthorized_user(
  connection: api.IConnection,
) {
  // Create an admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "SecureAdminPass123!";
  const adminFirstName: string = RandomGenerator.name();
  const adminLastName: string = RandomGenerator.name();
  const adminRole: "super_admin" | "full_admin" | "limited_admin" =
    "full_admin";

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: adminRole,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Generate a non-existent reservation ID
  const reservationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Create an unauthenticated connection to simulate unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Test 1: Unauthorized user tries to cancel - should get 401 Unauthorized or 403 Forbidden
  await TestValidator.httpError(
    "Unauthenticated user attempting to cancel reservation should get 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.inventory.reservations.erase(
        unauthConn,
        { reservationId },
      );
    },
  );

  // Test 2: Authenticated admin tries to cancel non-existent reservation - should get 404 Not Found
  await TestValidator.httpError(
    "Authenticated admin canceling non-existent reservation should get 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.inventory.reservations.erase(
        connection,
        { reservationId },
      );
    },
  );
}
