import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminDashboard";

/**
 * This test validates the full lifecycle of an admin dashboard deletion by an
 * authenticated admin. It ensures that an admin can register, create a new
 * dashboard, and delete it successfully.
 *
 * The process involves:
 *
 * 1. Creating a new admin user via the join API
 * 2. Creating a new admin dashboard
 * 3. Deleting the created dashboard by ID
 * 4. Validating responses and ensuring no errors occur
 */
export async function test_api_admin_dashboard_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a new admin user by calling auth admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const randomPasswordHash = RandomGenerator.alphaNumeric(64); // Simulated hash

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: randomPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: null,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  TestValidator.predicate(
    "admin token should exist",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Create a new admin dashboard with unique dashboard_name and optional description
  const dashboardName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const description = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 10,
  });

  const dashboard: IShoppingMallAdminDashboard =
    await api.functional.shoppingMall.admin.adminDashboard.create(connection, {
      body: {
        dashboard_name: dashboardName,
        description: description,
      } satisfies IShoppingMallAdminDashboard.ICreate,
    });
  typia.assert(dashboard);

  TestValidator.predicate(
    "dashboard id should be UUID",
    typeof dashboard.id === "string" && dashboard.id.length > 0,
  );
  TestValidator.equals(
    "dashboard name matches",
    dashboard.dashboard_name,
    dashboardName,
  );

  // 3. Delete the created admin dashboard by id
  await api.functional.shoppingMall.admin.adminDashboard.eraseAdminDashboard(
    connection,
    {
      id: dashboard.id,
    },
  );

  // 4. No response body, successful completion implies deletion
  // (No exception means success)
}
