import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test creation of a new admin session by an authenticated admin user.
 *
 * The scenario includes:
 *
 * 1. Registering a new admin via /auth/admin/join
 * 2. Creating another admin user with valid data
 * 3. Creating a new session for that admin user
 * 4. Verifying all responses via typia.assert and TestValidator
 * 5. Handling duplicate email errors properly
 *
 * This scenario ensures all security, authentication, and authorization
 * mechanisms behave as expected.
 */
export async function test_api_admin_session_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminCreateBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    phone_number: null,
    role: RandomGenerator.pick(["superadmin", "admin", "support"] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuth1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody1,
    });
  typia.assert(adminAuth1);

  // 2. Create another admin user
  // Switch context: join to get new token for next operations
  const adminCreateBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "AdminPass456!",
    phone_number: null,
    role: RandomGenerator.pick(["superadmin", "admin", "support"] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin2: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: adminCreateBody2,
    });
  typia.assert(admin2);

  // 3. Create a new admin session for the created admin user
  const tokenString = typia.random<string>();

  const ipAddress = typia.random<string & tags.Format<"ipv4">>();

  const sessionCreateBody = {
    token: tokenString,
    ip: ipAddress,
    user_agent: "Mozilla/5.0 (compatible; TestBot/1.0)",
    expires_at: null,
  } satisfies IShoppingMallAdminSession.ICreate;

  const session: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.admins.adminSessions.create(
      connection,
      {
        adminId: admin2.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // Validate critical properties
  TestValidator.equals("session is active", session.is_active, true);
  TestValidator.equals(
    "session id matches UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
    true,
  );

  // 4. Attempt duplicate admin creation to test error handling
  await TestValidator.error("duplicate admin email should fail", async () => {
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: adminCreateBody2,
    });
  });
}
