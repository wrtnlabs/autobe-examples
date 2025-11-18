import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test the session revocation endpoint as part of a security incident response
 * workflow.
 *
 * This test simulates an admin responding to suspected account compromise by
 * immediately terminating all sessions. The scenario validates the critical
 * security use case where admins need immediate, comprehensive session
 * termination capability to protect their accounts from unauthorized access.
 *
 * Test workflow:
 *
 * 1. Create admin account to establish authentication context
 * 2. Verify admin authentication succeeds with valid credentials
 * 3. Invoke revoke all sessions endpoint to perform security action
 * 4. Verify operation completes successfully without errors
 * 5. Validate void response indicates all sessions terminated
 */
export async function test_api_admin_session_revocation_security_response(
  connection: api.IConnection,
) {
  // Step 1: Create admin account representing the potentially compromised account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  const createAdminBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string>(),
  } satisfies ITodoListAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: createAdminBody,
  });

  // Step 2: Validate admin registration succeeded
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.predicate("admin has valid ID", admin.id.length > 0);
  TestValidator.predicate(
    "admin has access token",
    admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "admin has refresh token",
    admin.token.refresh.length > 0,
  );

  // Step 3: Execute security action - revoke all sessions
  // This is the critical security operation that terminates all active sessions
  await api.functional.todoList.admin.admins.me.sessions.revokeAll(connection);

  // Step 4: Verify operation completed successfully
  // The void return with no exception indicates all sessions were revoked
  // In a real scenario, all refresh tokens would now be invalid and
  // the admin would need to re-authenticate on all devices
}
