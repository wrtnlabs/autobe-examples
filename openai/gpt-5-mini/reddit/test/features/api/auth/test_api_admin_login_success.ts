import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * E2E test: Admin authentication success flow
 *
 * Business purpose: This test verifies the admin onboarding and authentication
 * sequence:
 *
 * 1. Create an admin account via POST /auth/admin/join
 * 2. Authenticate via POST /auth/admin/login using the same credentials
 *
 * The test asserts that both endpoints return the expected
 * ICommunityPortalAdmin.IAuthorized payload, including a valid token container
 * (IAuthorizationToken) and public admin/user summaries. It uses `satisfies`
 * for request bodies, `typia.assert()` for response validation, and
 * TestValidator assertions for business-level checks. All API calls are awaited
 * and connection.headers are never modified by the test code.
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // 1) Prepare unique admin create payload
  const password = "P@ssw0rd!";
  const username = RandomGenerator.alphaNumeric(8); // compact unique handle
  const email = typia.random<string & tags.Format<"email">>();

  const createBody = {
    username,
    email,
    password,
    displayName: RandomGenerator.name(2),
    adminLevel: "super",
    isActive: true,
  } satisfies ICommunityPortalAdmin.ICreate;

  // 2) Create admin account
  const joined: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  // Full runtime validation
  typia.assert(joined);

  // Business-level checks
  TestValidator.equals(
    "joined admin username matches request",
    joined.admin.username,
    createBody.username,
  );
  TestValidator.equals(
    "joined user summary username matches request",
    joined.user.username,
    createBody.username,
  );

  // Token shape assertion
  typia.assert(joined.token);

  // 3) Login using created credentials
  const loginBody = {
    identifier: createBody.email,
    password,
  } satisfies ICommunityPortalAdmin.ILogin;

  const logged: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(logged);
  typia.assert(logged.token);

  // Business-level checks for login response
  TestValidator.equals(
    "login returned same admin username",
    logged.admin.username,
    createBody.username,
  );
  TestValidator.equals(
    "login returned same user username",
    logged.user.username,
    createBody.username,
  );

  // Ensure token strings are present and expiry fields parse as dates (business validation)
  TestValidator.predicate(
    "login access token non-empty",
    typeof logged.token.access === "string" && logged.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token non-empty",
    typeof logged.token.refresh === "string" && logged.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry is parseable date-time",
    Date.parse(logged.token.expired_at) > 0,
  );
  TestValidator.predicate(
    "refreshable_until is parseable date-time",
    Date.parse(logged.token.refreshable_until) > 0,
  );
}
