import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Validate admin login with valid credentials and reject invalid password
 * attempts.
 *
 * Business flow
 *
 * 1. Seed a fresh administrator using POST /auth/admin/join
 *    (IEconDiscussAdmin.ICreate)
 *
 *    - Generate random email and a compliant password (>=8 chars)
 *    - Provide display_name and optional preferences (timezone, locale)
 *    - Expect IEconDiscussAdmin.IAuthorized with token and optional subject
 * 2. Success path: POST /auth/admin/login (IEconDiscussAdmin.ILogin)
 *
 *    - Use the same seeded email/password
 *    - Expect IEconDiscussAdmin.IAuthorized; assert the id matches the joined admin
 *    - If subject is present, assert initial policy flags (emailVerified=false,
 *         mfaEnabled=false)
 * 3. Failure path: POST /auth/admin/login with wrong password
 *
 *    - Expect runtime error (do not assert HTTP status code)
 *
 * Constraints & rules
 *
 * - Use `satisfies` with exact DTO variants (ICreate, ILogin) and const bodies
 * - Always await API calls, validate non-void responses with typia.assert()
 * - Do not touch connection.headers; SDK manages tokens automatically
 * - No type error testing; only business-logic error for wrong password
 */
export async function test_api_admin_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1) Seed admin via join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;

  const joined = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IEconDiscussAdmin.IAuthorized>(joined);

  // 2) Success login using the same credentials
  const loginBody = {
    email,
    password,
  } satisfies IEconDiscussAdmin.ILogin;

  const loggedIn = await api.functional.auth.admin.login(connection, {
    body: loginBody,
  });
  typia.assert<IEconDiscussAdmin.IAuthorized>(loggedIn);

  // Identity consistency between join and login
  TestValidator.equals(
    "login returns the same admin id as joined",
    loggedIn.id,
    joined.id,
  );

  // Optional policy flags on subject if provided
  if (loggedIn.admin !== undefined) {
    TestValidator.equals(
      "new admin starts with emailVerified=false",
      loggedIn.admin.emailVerified,
      false,
    );
    TestValidator.equals(
      "new admin starts with mfaEnabled=false",
      loggedIn.admin.mfaEnabled,
      false,
    );
  }

  // 3) Failure path: invalid password
  const wrongPassword: string = password + "x";
  await TestValidator.error(
    "login with incorrect password must fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email,
          password: wrongPassword,
        } satisfies IEconDiscussAdmin.ILogin,
      });
    },
  );
}
