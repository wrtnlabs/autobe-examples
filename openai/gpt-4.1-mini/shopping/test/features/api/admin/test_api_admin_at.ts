import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_at(connection: api.IConnection) {
  // 1. Register a new admin user via auth/admin/join
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "securePassword123!",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorizedAdmin);

  // 2. Use the returned admin ID to fetch the admin details
  const adminDetails: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.at(connection, {
      id: authorizedAdmin.id,
    });
  typia.assert(adminDetails);

  // 3. Validate the admin details fields
  TestValidator.predicate(
    "admin id exists",
    typeof adminDetails.id === "string" && adminDetails.id.length > 0,
  );
  TestValidator.equals(
    "admin email matches",
    adminDetails.email,
    authorizedAdmin.email,
  );
  TestValidator.equals(
    "admin full_name matches",
    adminDetails.full_name,
    authorizedAdmin.full_name,
  );
  TestValidator.predicate(
    "admin created_at is ISO date-time",
    typeof adminDetails.created_at === "string" &&
      adminDetails.created_at.length > 0,
  );
  TestValidator.predicate(
    "admin updated_at is ISO date-time",
    typeof adminDetails.updated_at === "string" &&
      adminDetails.updated_at.length > 0,
  );
  // deleted_at can be null or undefined
  if (
    adminDetails.deleted_at !== null &&
    adminDetails.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "admin deleted_at is ISO date-time",
      typeof adminDetails.deleted_at === "string" &&
        adminDetails.deleted_at.length > 0,
    );
  }
}
