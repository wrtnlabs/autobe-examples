import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test: Admin Session Revocation Endpoint Validation
 *
 * Validates that the session revocation endpoint can be called successfully by
 * an authenticated administrator. This test is limited by API design
 * constraints as the authentication responses do not include session IDs and no
 * session listing endpoint is available.
 *
 * Due to these limitations, this test validates:
 *
 * 1. Admin account creation and authentication works
 * 2. Multiple concurrent logins create separate sessions
 * 3. The session revocation endpoint accepts valid requests
 *
 * Note: Full validation of session invalidation behavior (testing that revoked
 * sessions cannot refresh tokens while other sessions remain active) is not
 * possible without additional API endpoints for token refresh and session
 * listing.
 *
 * Workflow:
 *
 * 1. Register a new admin account (creates first session)
 * 2. Perform second login (creates second session)
 * 3. Call session revocation endpoint with valid UUID format
 */
export async function test_api_admin_session_single_revocation_success(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdmin@Pass123!";

  const firstSession: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://admin.example.com/register",
        referrer: "https://admin.example.com/home",
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(firstSession);

  TestValidator.predicate(
    "first session should have valid admin ID",
    firstSession.id.length > 0,
  );
  TestValidator.predicate(
    "first session should have access token",
    firstSession.token.access.length > 0,
  );

  const secondSession: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/home",
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(secondSession);

  TestValidator.predicate(
    "second session should have different access token",
    firstSession.token.access !== secondSession.token.access,
  );

  const sessionIdToRevoke = typia.random<string & tags.Format<"uuid">>();

  await api.functional.todoList.admin.admins.me.sessions.erase(connection, {
    sessionId: sessionIdToRevoke,
  });
}
