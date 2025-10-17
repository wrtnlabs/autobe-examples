import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test retrieving active admin sessions across multiple devices.
 *
 * This test validates that an authenticated admin can retrieve a comprehensive
 * list of all their active sessions. The scenario creates a new admin account,
 * which automatically creates an initial session, then retrieves the active
 * sessions list to verify proper session tracking functionality.
 *
 * Test workflow:
 *
 * 1. Create a new admin account (automatically authenticates and creates session)
 * 2. Retrieve the list of active sessions for the authenticated admin
 * 3. Validate response structure contains sessions array and total_count
 * 4. Verify session count matches array length
 * 5. Confirm at least one active session exists
 * 6. Validate sessions contain device tracking information
 */
export async function test_api_admin_sessions_list_active_devices(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: RandomGenerator.pick([
      "super_admin",
      "order_manager",
      "content_moderator",
      "support_admin",
    ] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Validate admin creation response - business logic checks
  TestValidator.equals(
    "admin email matches",
    admin.email,
    adminCreateData.email,
  );
  TestValidator.equals("admin name matches", admin.name, adminCreateData.name);
  TestValidator.equals(
    "admin role matches",
    admin.role_level,
    adminCreateData.role_level,
  );

  // Step 2: Retrieve active sessions list
  const sessionList: IShoppingMallAdmin.ISessionList =
    await api.functional.auth.admin.sessions.listSessions(connection);
  typia.assert(sessionList);

  // Step 3: Validate session count matches array length
  TestValidator.equals(
    "session count matches array length",
    sessionList.sessions.length,
    sessionList.total_count,
  );

  // Step 4: Validate that at least one session exists (from the join operation)
  TestValidator.predicate(
    "at least one active session exists",
    sessionList.sessions.length >= 1,
  );

  // Step 5: Validate that sessions contain tracking information
  const hasDeviceInfo = sessionList.sessions.some(
    (s) =>
      s.device_type !== undefined ||
      s.device_name !== undefined ||
      s.browser_name !== undefined ||
      s.operating_system !== undefined ||
      s.approximate_location !== undefined,
  );

  TestValidator.predicate(
    "sessions contain device tracking information",
    hasDeviceInfo,
  );
}
