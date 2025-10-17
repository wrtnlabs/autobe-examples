import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Validate successful login for an existing member using email & password.
 *
 * Business flow
 *
 * 1. Register a new member via POST /auth/memberUser/join using valid data
 *
 *    - Email format, unique
 *    - Username matches ^[A-Za-z0-9_]{3,20}$
 *    - Password length 8–64 with at least one letter and one digit
 *    - Consent timestamps as ISO 8601 strings
 * 2. Perform POST /auth/memberUser/login with the same email/password
 *
 *    - Use a public connection (no Authorization header) by cloning the base
 *         connection with headers: {} (no further header manipulation)
 * 3. Validate
 *
 *    - Response matches ICommunityPlatformMemberUser.IAuthorized
 *    - Tokens exist and are non-empty
 *    - Principal id equals the id returned by join
 *    - If username is present in IAuthorized, it equals the joined username
 */
export async function test_api_member_login_with_email_success(
  connection: api.IConnection,
) {
  // Prepare unique identifiers
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const usernameLengthCandidates = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
  const usernameLength = RandomGenerator.pick(usernameLengthCandidates);
  const usernameBase = RandomGenerator.alphaNumeric(usernameLength);
  const letterPart = RandomGenerator.alphabets(6);
  const digit = RandomGenerator.pick([..."0123456789"]);
  const tail = RandomGenerator.alphaNumeric(4);
  const password = `${letterPart}${digit}${tail}`; // ensures at least 1 letter and 1 digit, length >= 11

  const joinBody = {
    email,
    username: usernameBase,
    password,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  // 1) Register member
  const joined: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2) Login with public (unauthenticated) connection
  const publicConnection: api.IConnection = { ...connection, headers: {} };
  const loginBody = {
    email,
    password,
  } satisfies ICommunityPlatformMemberUser.ILogin;
  const loggedIn: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(publicConnection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3) Validations
  // Principal id should match between join and login
  TestValidator.equals(
    "login principal id equals joined principal id",
    loggedIn.id,
    joined.id,
  );

  // If username is present in IAuthorized, it should match the joined username
  if (loggedIn.username !== undefined) {
    TestValidator.equals(
      "username in login payload equals joined username",
      loggedIn.username,
      joinBody.username,
    );
  }

  // Token presence and non-empty checks
  TestValidator.predicate(
    "access token is non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loggedIn.token.refresh.length > 0,
  );

  // Date-time formats are validated by typia.assert already; no extra checks needed
}
