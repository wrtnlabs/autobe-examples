import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validates that an authenticated admin can retrieve session detail (including
 * audit and metadata) via GET
 * /todoList/admin/admins/{adminId}/sessions/{sessionId} as required for
 * compliance and audit.
 *
 * Steps:
 *
 * 1. Register a new admin account via join API (with required onboarding fields).
 * 2. Use join result to extract the admin's id and session summary.
 * 3. Using the admin's session context, retrieve that exact session record using
 *    the detail API.
 * 4. Validate that all session properties are present and types are correct.
 * 5. Ensure the admin summary in the session record matches the admin registered
 *    in step 1.
 */
export async function test_api_admin_session_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Register a new admin (self-onboarding with unique credentials & metadata)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name(2);
  const href = "https://admin-onboarding.example.com/register";
  const referrer = "https://admin-portal.example.com";
  const ip = typia.random<
    string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)
  >();
  const joinOutput: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: displayName,
        href,
        referrer,
        ip,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(joinOutput);

  // Check that session summary is present in join output
  TestValidator.predicate(
    "admin join response contains session summary",
    joinOutput.session !== undefined,
  );

  // Retrieve session details for the new admin using the session summary
  const sessionSummary = joinOutput.session!;
  const session: ITodoListAdminSession =
    await api.functional.todoList.admin.admins.sessions.at(connection, {
      adminId: joinOutput.id,
      sessionId: sessionSummary.id,
    });
  typia.assert(session);

  // Check all critical session fields are present and match expected types
  TestValidator.equals(
    "session.id matches session summary",
    session.id,
    sessionSummary.id,
  );
  TestValidator.equals("session.ip matches onboarding ip", session.ip, ip);
  TestValidator.equals(
    "session.href matches onboarding href",
    session.href,
    href,
  );
  TestValidator.equals(
    "session.referrer matches onboarding referrer",
    session.referrer,
    referrer,
  );
  TestValidator.predicate(
    "session.created_at is defined",
    typeof session.created_at === "string" && session.created_at.length > 0,
  );
  // expired_at may be null or undefined for active session
  // Admin summary inside session must match created admin profile
  TestValidator.predicate(
    "session.admin summary is present",
    session.admin !== undefined,
  );
  if (session.admin) {
    TestValidator.equals(
      "session.admin.id matches admin id",
      session.admin.id,
      joinOutput.id,
    );
    TestValidator.equals(
      "session.admin.email matches admin email",
      session.admin.email,
      adminEmail,
    );
    TestValidator.equals(
      "session.admin.display_name matches",
      session.admin.display_name,
      displayName,
    );
  }
}
