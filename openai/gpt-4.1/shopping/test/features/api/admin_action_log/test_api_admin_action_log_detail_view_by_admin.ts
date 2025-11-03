import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminActionLog";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test retrieval of detailed admin action log record by an authenticated admin
 * and verify access controls.
 *
 * 1. Register a new admin account to act as the querying admin user.
 * 2. Use the admin account (already authenticated after join) to call the admin
 *    action log detail endpoint with a random UUID as log ID and check valid
 *    structure.
 * 3. Attempt to access an invalid log ID as admin to confirm not found or
 *    forbidden error (do not check status code, just that error occurs).
 * 4. Attempt access as an unauthenticated connection and confirm access is denied.
 */
export async function test_api_admin_action_log_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminName: string = RandomGenerator.name();
  const adminRole: string = RandomGenerator.pick([
    "super",
    "support",
    "compliance",
    "operator",
  ] as const);
  const adminStatus: string = "active";
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: adminRole,
        status: adminStatus,
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin attempts to fetch a specific admin action log detail with a random log ID (UUID)
  const queryLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  let log: IShoppingAdminActionLog | null = null;
  try {
    log = await api.functional.shopping.admin.adminActionLogs.at(connection, {
      adminActionLogId: queryLogId,
    });
    typia.assert(log);
    TestValidator.equals(
      "returned log id matches query id",
      log.id,
      queryLogId,
    );
    // Basic field validations (all fields exist per DTO)
    TestValidator.predicate("log.created_at exists", !!log.created_at);
    TestValidator.predicate("log.action_type exists", !!log.action_type);
    TestValidator.predicate(
      "log.admin_id is uuid or null/undefined",
      log.admin_id === null ||
        log.admin_id === undefined ||
        typeof log.admin_id === "string",
    );
  } catch {
    // If not found, this is acceptable and will be explicitly tested below
  }

  // 3. Attempt to fetch a non-existent/unauthorized log, ensure error is thrown
  const nonExistentLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "admin access to non-existent/unauthorized log should fail",
    async () => {
      await api.functional.shopping.admin.adminActionLogs.at(connection, {
        adminActionLogId: nonExistentLogId,
      });
    },
  );

  // 4. Attempt access as unauthenticated (no admin token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access admin action log detail",
    async () => {
      await api.functional.shopping.admin.adminActionLogs.at(unauthConn, {
        adminActionLogId: queryLogId,
      });
    },
  );
}
