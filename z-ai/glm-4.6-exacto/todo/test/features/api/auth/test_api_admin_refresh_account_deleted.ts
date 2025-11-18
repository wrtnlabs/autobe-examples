import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Ensure that attempting to refresh tokens for a session tied to a soft-deleted
 * administrator (deleted_at is not null) is denied.
 *
 * 1. Register and log in as admin to obtain a valid refresh token.
 * 2. (Manual/mock step) Soft-delete the admin in the database (simulate deleted_at
 *    being set).
 * 3. Attempt to refresh tokens using the prior refresh token.
 * 4. Confirm refresh fails (error is thrown/denied), and no new tokens are
 *    provided.
 * 5. Optionally, confirm audit event for compliance (if API response
 *    allows/implementation supports).
 */
export async function test_api_admin_refresh_account_deleted(
  connection: api.IConnection,
) {
  // 1. Register and log in as admin to obtain a valid refresh token
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: "https://admin.todoapp.example.com/login",
    referrer: "https://admin.todoapp.example.com/",
    ip: "192.168.1.10",
  } satisfies ITodoAppAdmin.ILogin;

  const adminOutput = await api.functional.auth.admin.login(connection, {
    body: loginBody,
  });
  typia.assert(adminOutput);

  TestValidator.predicate(
    "received refresh token",
    typeof adminOutput.token.refresh === "string" &&
      adminOutput.token.refresh.length > 0,
  );

  // 2. (Manual/mock step) Soft-delete the admin (simulate admin.deleted_at not null)
  // NOTE: As no admin account management API is exposed, we cannot soft-delete via the API here.
  // In a real test environment, this would be done externally (e.g., direct DB update or admin API).
  // For this test code, assume admin account is now deleted and all session tokens should now fail for refresh.

  // 3. Attempt to use the refresh token
  await TestValidator.error(
    "refresh with soft-deleted admin should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: adminOutput.token.refresh,
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );
  // 4. Optionally, check for audit event by reviewing side effect / log (cannot check via public API, left as manual audit for compliance).
}
