import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

export async function test_api_admin_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user and authenticate
  const adminCreateBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    name: RandomGenerator.name(),
    password: "Password123!",
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create an admin user for session ownership
  const adminUserCreateBody = {
    email: `owner${RandomGenerator.alphaNumeric(6)}@example.com`,
    name: RandomGenerator.name(),
    password: "Password123!",
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdminUser: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: adminUserCreateBody,
    });
  typia.assert(createdAdminUser);

  // 3. Create an admin session for the created admin user
  const sessionCreateBody = {
    token: `token-${RandomGenerator.alphaNumeric(20)}`,
    ip: "192.168.1.1",
    user_agent: "Mozilla/5.0 (compatible; E2ETestAgent/1.0)",
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  } satisfies IShoppingMallAdminSession.ICreate;

  const createdAdminSession: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.admins.adminSessions.create(
      connection,
      {
        adminId: createdAdminUser.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(createdAdminSession);

  // 4. Delete the created admin session
  // Note: The connection object automatically carries the authentication token
  await api.functional.shoppingMall.admin.admins.adminSessions.erase(
    connection,
    {
      adminId: createdAdminUser.id,
      adminSessionId: createdAdminSession.id,
    },
  );

  // 5. Confirm session deletion by attempting to delete again should fail
  await TestValidator.error(
    "deleting a non-existent admin session should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.adminSessions.erase(
        connection,
        {
          adminId: createdAdminUser.id,
          adminSessionId: createdAdminSession.id,
        },
      );
    },
  );
}
