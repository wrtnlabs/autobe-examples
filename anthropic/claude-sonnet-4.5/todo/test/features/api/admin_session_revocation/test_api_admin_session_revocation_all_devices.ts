import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test the complete workflow of an administrator revoking all active sessions
 * across all devices.
 *
 * This test validates the 'logout from all devices' security feature by:
 *
 * 1. Creating a new admin account through registration
 * 2. Calling the revoke all sessions endpoint to terminate all active sessions
 * 3. Verifying successful execution with void response
 *
 * This critical security functionality enables administrators to forcefully
 * terminate all their sessions simultaneously, which is essential for
 * responding to security incidents, handling lost devices, or enforcing
 * security policies after password changes.
 */
export async function test_api_admin_session_revocation_all_devices(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureP@ssw0rd123";
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  const registrationData = {
    email: adminEmail,
    password: adminPassword,
    href: currentUrl,
    referrer: referrerUrl,
  } satisfies ITodoListAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: registrationData,
  });

  typia.assert<ITodoListAdmin.IAuthorized>(admin);

  // Step 2: Revoke all active sessions for this admin
  await api.functional.todoList.admin.admins.me.sessions.revokeAll(connection);

  // Step 3: Validation - if no error was thrown, the operation succeeded
  // The revokeAll endpoint returns void (204 No Content), indicating all sessions were successfully expired
}
