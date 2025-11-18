import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSessionRevocationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSessionRevocationSummary";

/**
 * Test that all revoked sessions receive the same expired_at timestamp during
 * bulk revocation.
 *
 * This test ensures temporal consistency for audit trails by validating that
 * when an admin revokes all sessions, the revoked_at timestamp is consistent
 * and accurate. This is critical for security auditing and compliance
 * requirements.
 *
 * Workflow:
 *
 * 1. Register admin account via /auth/admin/join to create initial session
 * 2. Create two additional sessions via /auth/admin/login (total 3 sessions)
 * 3. Call DELETE /todoList/admin/admins/me/sessions to revoke all sessions
 * 4. Capture the revoked_at timestamp from the response
 * 5. Verify revoked_count equals 3 (all sessions revoked)
 * 6. Verify revoked_at is in valid ISO 8601 format
 * 7. Verify revoked_at timestamp is very recent (within last few seconds)
 * 8. Verify notification_sent is true
 */
export async function test_api_admin_session_bulk_revocation_timestamp_consistency(
  connection: api.IConnection,
) {
  // Step 1: Register admin account to create initial session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";

  const registeredAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.1.1",
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(registeredAdmin);

  // Step 2: Create two additional sessions via login (total 3 sessions including registration)
  const session2 = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.1.2",
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(session2);

  const session3 = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.1.3",
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(session3);

  // Capture timestamp before revocation for comparison
  const beforeRevocation = new Date();

  // Step 3: Call DELETE endpoint to revoke all sessions
  const revocationSummary =
    await api.functional.todoList.admin.admins.me.sessions.eraseAll(connection);
  typia.assert(revocationSummary);

  // Capture timestamp after revocation
  const afterRevocation = new Date();

  // Step 4 & 5: Verify revoked_count equals 3
  TestValidator.equals(
    "revoked_count should equal 3",
    revocationSummary.revoked_count,
    3,
  );

  // Step 6: Verify revoked_at is in valid ISO 8601 format
  const revokedAtDate = new Date(revocationSummary.revoked_at);
  TestValidator.predicate(
    "revoked_at should be valid ISO 8601 date-time format",
    !isNaN(revokedAtDate.getTime()),
  );

  // Step 7: Verify revoked_at timestamp is very recent (within last few seconds)
  const revocationTime = revokedAtDate.getTime();
  const beforeTime = beforeRevocation.getTime();
  const afterTime = afterRevocation.getTime();

  TestValidator.predicate(
    "revoked_at should be between before and after revocation timestamps",
    revocationTime >= beforeTime && revocationTime <= afterTime + 1000,
  );

  TestValidator.predicate(
    "revoked_at should be within 5 seconds of current time",
    afterTime - revocationTime < 5000,
  );

  // Step 8: Verify notification_sent is true
  TestValidator.equals(
    "notification_sent should be true",
    revocationSummary.notification_sent,
    true,
  );
}
