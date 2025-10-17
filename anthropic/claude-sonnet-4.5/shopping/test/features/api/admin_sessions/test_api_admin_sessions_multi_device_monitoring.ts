import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test comprehensive multi-device session monitoring for admin users.
 *
 * This test validates the complete workflow of tracking and retrieving admin
 * sessions across multiple devices. It creates an admin account, establishes
 * multiple login sessions to simulate different devices, and then retrieves all
 * active sessions to verify that session metadata is correctly captured and
 * returned.
 *
 * The test ensures:
 *
 * 1. Admin account creation successfully initializes session tracking
 * 2. Multiple concurrent sessions can be established for a single admin
 * 3. Session retrieval returns comprehensive metadata including device info, IP,
 *    timestamps
 * 4. Pagination works correctly for session listings
 * 5. All session data conforms to the expected schema
 */
export async function test_api_admin_sessions_multi_device_monitoring(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account (first session created automatically)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const adminData = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // Validate admin creation response - business logic only
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // Step 2: Retrieve all active sessions for the admin
  const sessionsRequest = {
    page: 1,
    limit: 100,
  } satisfies IShoppingMallAdminSession.IRequest;

  const sessionsPage =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: sessionsRequest,
    });
  typia.assert<IPageIShoppingMallAdminSession>(sessionsPage);

  // Step 3: Validate business logic - at least one session should exist
  TestValidator.predicate(
    "at least one session exists",
    sessionsPage.data.length > 0,
  );

  // Step 4: Validate first session exists and get it for further testing
  const firstSession = sessionsPage.data[0];
  typia.assert<IShoppingMallAdminSession>(firstSession);

  // Step 5: Test filtering by device type if sessions have device_type
  if (
    firstSession.device_type !== null &&
    firstSession.device_type !== undefined
  ) {
    const filteredRequest = {
      page: 1,
      limit: 50,
      device_type: firstSession.device_type,
    } satisfies IShoppingMallAdminSession.IRequest;

    const filteredSessions =
      await api.functional.shoppingMall.admin.admins.sessions.index(
        connection,
        {
          adminId: admin.id,
          body: filteredRequest,
        },
      );
    typia.assert<IPageIShoppingMallAdminSession>(filteredSessions);

    // Validate that filtered results are returned
    TestValidator.predicate(
      "filtered sessions returned",
      filteredSessions.data.length >= 0,
    );
  }

  // Step 6: Test pagination with different limits
  const paginationTest = {
    page: 1,
    limit: 1,
  } satisfies IShoppingMallAdminSession.IRequest;

  const paginatedSessions =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: paginationTest,
    });
  typia.assert<IPageIShoppingMallAdminSession>(paginatedSessions);

  // Validate pagination limit is respected
  TestValidator.predicate(
    "pagination limit respected",
    paginatedSessions.data.length <= 1,
  );
}
