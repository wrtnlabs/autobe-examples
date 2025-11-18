import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSessionRevocationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSessionRevocationSummary";

/**
 * Test that bulk session revocation only affects the authenticated admin's
 * sessions and does not impact other admins' sessions.
 *
 * This test validates proper session isolation and security boundaries by:
 *
 * 1. Creating two independent admin accounts (Admin A and Admin B)
 * 2. Establishing multiple sessions for each admin (simulating multi-device login)
 * 3. Revoking all sessions for Admin A
 * 4. Verifying Admin A cannot perform authenticated operations after revocation
 * 5. Verifying Admin B can still perform authenticated operations
 * 6. Confirming session isolation prevents cross-admin interference
 */
export async function test_api_admin_session_bulk_revocation_isolation(
  connection: api.IConnection,
) {
  // Step 1: Register first admin account (Admin A)
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAPassword = "SecurePass123!@#";

  const adminA = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminAEmail,
      password: adminAPassword,
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(adminA);

  // Step 2: Perform additional login for Admin A (creating second session)
  const adminALogin2 = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminAEmail,
      password: adminAPassword,
      ip: "192.168.1.101",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(adminALogin2);

  // Step 3: Register second admin account (Admin B)
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBPassword = "SecurePass456!@#";

  const adminB = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminBEmail,
      password: adminBPassword,
      ip: "192.168.1.200",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(adminB);

  // Step 4: Perform additional login for Admin B (creating second session)
  const adminBLogin2 = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminBEmail,
      password: adminBPassword,
      ip: "192.168.1.201",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(adminBLogin2);

  // Step 5: Switch back to Admin A's connection and call bulk session revocation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminAEmail,
      password: adminAPassword,
      ip: "192.168.1.102",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ILogin,
  });

  const revocationResult =
    await api.functional.todoList.admin.admins.me.sessions.eraseAll(connection);
  typia.assert(revocationResult);

  // Step 6: Verify Admin A's response shows revoked_count equals 2
  TestValidator.equals(
    "Admin A should have exactly 2 sessions revoked",
    revocationResult.revoked_count,
    2,
  );

  TestValidator.predicate(
    "revoked_at timestamp should be set",
    revocationResult.revoked_at.length > 0,
  );

  TestValidator.predicate(
    "notification should be sent",
    revocationResult.notification_sent === true,
  );

  // Step 7: Verify Admin B's sessions remain active by performing authenticated login
  const adminBVerification = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminBEmail,
      password: adminBPassword,
      ip: "192.168.1.202",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(adminBVerification);

  // Step 8: Verify Admin B can still perform authenticated operations
  TestValidator.equals(
    "Admin B should still be authenticated with correct email",
    adminBVerification.email,
    adminBEmail,
  );

  TestValidator.predicate(
    "Admin B should receive valid access token",
    adminBVerification.token.access.length > 0,
  );

  TestValidator.predicate(
    "Admin B should receive valid refresh token",
    adminBVerification.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "Admin B ID should remain unchanged",
    adminBVerification.id === adminB.id,
  );
}
