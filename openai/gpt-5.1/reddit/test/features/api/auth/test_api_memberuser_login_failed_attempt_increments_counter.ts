import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate memberUser login behavior after repeated failed attempts.
 *
 * Business context:
 *
 * - The authentication subsystem tracks failed login attempts and may enforce
 *   temporary lockouts using fields like failed_login_count and locked_until.
 * - The public APIs available in this test only expose these fields on successful
 *   authentication responses (IAuthorized), not on failures.
 * - Therefore, this test focuses on observable behavior: failed attempts must be
 *   rejected, and a subsequent correct login must still succeed and return a
 *   valid token bundle for the same account.
 *
 * Scenario:
 *
 * 1. Register a new member user via POST /auth/memberUser/join with random
 *    username, email, and password.
 * 2. Immediately perform a successful login with the correct identifier and
 *    password to establish a baseline authorized state and confirm DTO shape.
 * 3. Execute several consecutive login attempts with the same identifier but an
 *    incorrect password, asserting that each attempt fails.
 * 4. Perform another successful login with the correct password, confirming that
 *    authentication still works and that the account is not stuck in a
 *    locked-out state.
 * 5. Validate that the member id and username remain stable across join and
 *    subsequent login, and that a new access token is issued for the later
 *    successful login.
 */
export async function test_api_memberuser_login_failed_attempt_increments_counter(
  connection: api.IConnection,
) {
  // 1. Register a new member user via join
  const password: string = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `member_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password,
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joined);

  // 2. Immediate successful login with correct credentials to establish baseline
  const loginBodySuccess = {
    identifier: joined.username,
    password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const firstLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBodySuccess,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(firstLogin);

  // 3. Perform several failed login attempts with incorrect password
  const wrongPassword = `${password}_wrong`;
  const failedLoginBody = {
    identifier: joined.username,
    password: wrongPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const failedAttempts = 3 as const;
  for (let i = 0; i < failedAttempts; i++) {
    await TestValidator.error(
      "failed login attempt should be rejected",
      async () => {
        await api.functional.auth.memberUser.login(connection, {
          body: failedLoginBody,
        });
      },
    );
  }

  // 4. Successful login again with correct password
  const secondLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBodySuccess,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(secondLogin);

  // 5. Validate stable identity and refreshed token
  TestValidator.equals(
    "member id should remain stable across join and later login",
    secondLogin.id,
    joined.id,
  );
  TestValidator.equals(
    "username should remain stable across join and later login",
    secondLogin.username,
    joined.username,
  );

  TestValidator.predicate(
    "access token should change between first and second successful login",
    firstLogin.token.access !== secondLogin.token.access,
  );
}
