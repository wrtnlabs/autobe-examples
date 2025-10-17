import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Validate that member login rejects invalid credentials without leaking user
 * existence and without asserting HTTP status codes.
 *
 * Steps:
 *
 * 1. Register a new member via /auth/member/join with known credentials.
 * 2. Prepare an unauthenticated connection to avoid inherited Authorization.
 * 3. Try logging in with correct email but wrong password -> expect an error.
 * 4. Try logging in with a non-existent email -> expect an error.
 * 5. Sanity check: login with correct credentials should succeed.
 *
 * Notes:
 *
 * - Use IEconDiscussMember.ICreate for join and IEconDiscussMember.ILogin for
 *   login.
 * - Validate successful responses with typia.assert only; do not inspect headers
 *   or status codes.
 */
export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
) {
  // 1) Register a new member with valid credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const createBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const joined = await api.functional.auth.member.join(connection, {
    body: createBody,
  });
  typia.assert(joined);

  // 2) Prepare unauthenticated connection for login tests (no token inheritance)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Wrong password attempt (same email, different password)
  const wrongPasswordBody = {
    email,
    password: `${password}x`, // ensure it's wrong but still >= 8 chars
  } satisfies IEconDiscussMember.ILogin;
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.member.login(unauthConn, {
        body: wrongPasswordBody,
      });
    },
  );

  // 4) Non-existent email attempt (valid password, random new email)
  const nonexistentEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const nonexistentBody = {
    email: nonexistentEmail,
    password,
  } satisfies IEconDiscussMember.ILogin;
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.member.login(unauthConn, {
        body: nonexistentBody,
      });
    },
  );

  // 5) Sanity check: correct login should succeed
  const ok = await api.functional.auth.member.login(unauthConn, {
    body: { email, password } satisfies IEconDiscussMember.ILogin,
  });
  typia.assert(ok);
}
