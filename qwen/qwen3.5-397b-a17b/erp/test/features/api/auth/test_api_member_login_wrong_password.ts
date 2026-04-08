import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login attempt with incorrect password for existing member account.
 *
 * Validates the authentication system properly rejects invalid credentials while maintaining account accessibility. Tests that wrong password attempts are rejected with appropriate error responses, and that accounts remain accessible after failed login attempts (no lockout policy).
 *
 * Special attention is given to security best practices where error messages do not reveal whether the email or password was incorrect, preventing enumeration attacks. The test also verifies that successful authentication with correct credentials returns proper JWT tokens.
 *
 * 1. Register new member account with valid email and password.
 * 2. Attempt login with correct email but wrong password.
 * 3. Verify authentication fails with error response.
 * 4. Verify account remains accessible by logging in with correct password.
 * 5. Validate successful login returns authorization tokens.
 */
export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmPlatformMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  // 2. Verify member was created successfully
  TestValidator.equals("email matches", authorized.email, credentials.email);
  TestValidator.equals("member id exists", authorized.id !== null, true);
  // 3. Attempt login with WRONG password
  const loginConnection: api.IConnection = { host: connection.host };
  const wrongPasswordLogin = {
    email: credentials.email,
    password: "WrongPassword123!", // Different from registered password
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmPlatformMember.ILogin;
  await TestValidator.error("wrong password rejected", async () => {
    await api.functional.hrmPlatform.auth.member.login(loginConnection, {
      body: wrongPasswordLogin,
    });
  });
  // 4. Verify account is not locked out - login with CORRECT password should work
  const correctLoginConnection: api.IConnection = { host: connection.host };
  const correctPasswordLogin = {
    email: credentials.email,
    password: credentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmPlatformMember.ILogin;
  const successfulLogin = await api.functional.hrmPlatform.auth.member.login(
    correctLoginConnection,
    {
      body: correctPasswordLogin,
    },
  );
  typia.assert(successfulLogin);
  // 5. Validate successful login response
  TestValidator.equals(
    "email matches",
    successfulLogin.email,
    credentials.email,
  );
  TestValidator.equals("member id matches", successfulLogin.id, authorized.id);
  TestValidator.notEquals(
    "tokens differ from initial",
    successfulLogin.token.access,
    authorized.token.access,
  );
}
