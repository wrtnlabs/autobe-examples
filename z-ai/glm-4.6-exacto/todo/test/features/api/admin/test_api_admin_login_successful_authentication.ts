import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Ensure successful authentication for an active privileged administrator.
 *
 * This test calls the /auth/admin/login endpoint using a simulated, valid set
 * of admin credentials and full audit context (ip, href, referrer). It asserts
 * that the response contains valid access and refresh JWT tokens, a valid
 * session summary, and correct audit information. The test checks that login
 * with correct credentials leads to a valid session and all relevant tokens and
 * audit fields are correctly formed.
 *
 * Steps:
 *
 * 1. Generate random but valid admin email, strong password, and audit context
 *    (ip, href, referrer) for ITodoAppAdmin.ILogin.
 * 2. Call api.functional.auth.admin.login(connection, { body }) to authenticate.
 * 3. Assert typia.assert on result, and then check that the returned session,
 *    tokens, and context fields are correct and non-null.
 */
export async function test_api_admin_login_successful_authentication(
  connection: api.IConnection,
) {
  // Step 1: Prepare valid admin credentials and audit context.
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.ILogin;

  // Step 2: Perform the admin login operation.
  const result = await api.functional.auth.admin.login(connection, {
    body: loginBody,
  });
  typia.assert(result);

  // Step 3: Verify returned properties and session context.
  TestValidator.equals("authorized admin email", result.email, loginBody.email);
  TestValidator.predicate(
    "access token present",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry present",
    typeof result.token.expired_at === "string" &&
      result.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable until present",
    typeof result.token.refreshable_until === "string" &&
      result.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "session summary present",
    !!result.session && typeof result.session === "object",
  );
  if (result.session) {
    typia.assert(result.session);
    TestValidator.equals(
      "session admin_id",
      result.session.admin_id,
      result.id,
    );
    TestValidator.equals("session ip", result.session.ip, loginBody.ip);
    TestValidator.equals("session href", result.session.href, loginBody.href);
    TestValidator.equals(
      "session referrer",
      result.session.referrer,
      loginBody.referrer,
    );
    TestValidator.predicate(
      "session id is uuid",
      typeof result.session.id === "string" && result.session.id.length > 0,
    );
    TestValidator.predicate(
      "session created_at date-time",
      typeof result.session.created_at === "string" &&
        result.session.created_at.length > 0,
    );
  }
}
