import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Validate successful login with username and password without prior
 * Authorization header.
 *
 * Steps:
 *
 * 1. Register a member user via POST /auth/memberUser/join capturing id, username,
 *    and token.
 * 2. Create a fresh unauthenticated connection clone (headers: {}).
 * 3. Login via POST /auth/memberUser/login using username + correct password with
 *    email set to null.
 * 4. Assert both responses conform to IAuthorized and that principal (id) matches
 *    the created user.
 * 5. If username fields are present, verify consistency with the registered
 *    username.
 */
export async function test_api_member_login_with_username_success(
  connection: api.IConnection,
) {
  // 1) Register a member user (JOIN)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphaNumeric(10); // matches ^[A-Za-z0-9_]{3,20}$
  // Ensure password policy: at least one letter and one number, length >= 8
  const password: string = `${RandomGenerator.alphabets(6)}1${RandomGenerator.alphaNumeric(5)}`; // letters + digit guarantees policy

  const createBody = {
    email,
    username,
    password,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const joined = await api.functional.auth.memberUser.join(connection, {
    body: createBody,
  });
  typia.assert(joined);

  // 2) Create a fresh unauthenticated connection to ensure no prior Authorization header is required
  const freshConn: api.IConnection = { ...connection, headers: {} };

  // 3) Login with username + password (email explicitly null to reflect exclusivity)
  const loginBody = {
    email: null,
    username,
    password,
  } satisfies ICommunityPlatformMemberUser.ILogin;

  const loggedIn = await api.functional.auth.memberUser.login(freshConn, {
    body: loginBody,
  });
  typia.assert(loggedIn);

  // 4) Principal continuity: id must match
  TestValidator.equals(
    "logged-in user id should equal joined user id",
    loggedIn.id,
    joined.id,
  );

  // 5) Username consistency when provided in responses
  if (joined.username !== undefined) {
    TestValidator.equals(
      "joined username should match original username",
      joined.username,
      username,
    );
  }
  if (loggedIn.username !== undefined) {
    TestValidator.equals(
      "logged-in username should match original username",
      loggedIn.username,
      username,
    );
  }
}
