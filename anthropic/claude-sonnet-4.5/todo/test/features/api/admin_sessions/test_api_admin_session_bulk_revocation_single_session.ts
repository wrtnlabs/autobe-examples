import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSessionRevocationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSessionRevocationSummary";

/**
 * Test bulk session revocation when the admin has only one active session.
 *
 * This test validates that the bulk session revocation operation works
 * correctly with minimal session count (single session). It ensures accurate
 * count reporting, proper response structure, and valid timestamp generation.
 *
 * Workflow:
 *
 * 1. Register a new admin account via POST /auth/admin/join (creates single
 *    session)
 * 2. Call DELETE /todoList/admin/admins/me/sessions to revoke all sessions
 * 3. Verify response structure (ITodoListAdminSessionRevocationSummary)
 * 4. Confirm revoked_count equals 1 (single session was revoked)
 * 5. Validate revoked_at timestamp is present, valid, and recent
 * 6. Verify notification_sent equals true (security notification was sent)
 */
export async function test_api_admin_session_bulk_revocation_single_session(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account (creates single session)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  const registrationBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredAdmin);

  // Validate the initial admin structure
  TestValidator.predicate(
    "admin ID is valid UUID",
    typia.is<string & tags.Format<"uuid">>(registeredAdmin.id),
  );
  TestValidator.equals(
    "admin email matches registration",
    registeredAdmin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "access token is present",
    registeredAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    registeredAdmin.token.refresh.length > 0,
  );

  // Step 2: Call DELETE /todoList/admin/admins/me/sessions to revoke all sessions
  const revocationSummary: ITodoListAdminSessionRevocationSummary =
    await api.functional.todoList.admin.admins.me.sessions.eraseAll(connection);
  typia.assert(revocationSummary);

  // Step 3 & 4: Verify response structure and revoked_count equals 1
  TestValidator.equals(
    "revoked count should be 1 for single session",
    revocationSummary.revoked_count,
    1,
  );

  // Step 5: Validate revoked_at timestamp is present and valid
  TestValidator.predicate(
    "revoked_at is valid date-time format",
    typia.is<string & tags.Format<"date-time">>(revocationSummary.revoked_at),
  );

  const revokedAtDate = new Date(revocationSummary.revoked_at);
  const now = new Date();
  TestValidator.predicate(
    "revoked_at timestamp is recent (within last minute)",
    now.getTime() - revokedAtDate.getTime() < 60000,
  );

  // Step 6: Verify notification_sent equals true
  TestValidator.equals(
    "security notification should be sent",
    revocationSummary.notification_sent,
    true,
  );
}
