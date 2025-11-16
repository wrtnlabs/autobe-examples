import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test multiple concurrent authenticated sessions for a single user.
 *
 * This test validates that a user account can maintain multiple simultaneous
 * authenticated sessions with different JWT tokens. The test performs the
 * following workflow:
 *
 * 1. Register a new user account with initial credentials
 * 2. Perform multiple sequential login operations from different session contexts
 *    (varying href and referrer URLs to simulate different login origins)
 * 3. Verify that each login returns distinct access and refresh tokens
 * 4. Validate that all tokens are properly formatted and contain valid user
 *    information
 * 5. Confirm that multiple concurrent sessions can coexist for the same user
 *    account
 */
export async function test_api_user_login_multiple_concurrent_sessions(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const registrationUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://app.example.com/register",
        referrer: "https://marketing.example.com",
      } satisfies ITodoAppUser.ICreate,
    });

  typia.assert(registrationUser);
  TestValidator.equals(
    "registered user email matches input",
    registrationUser.email,
    userEmail,
  );

  // Step 2: Perform multiple sequential logins from different contexts
  const session1Href = "https://app.example.com/login";
  const session1Referrer = "https://search.example.com";

  const session1: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: session1Href,
        referrer: session1Referrer,
      } satisfies ITodoAppUser.ILogin,
    });

  typia.assert(session1);
  TestValidator.equals(
    "session 1 user matches registered user",
    session1.id,
    registrationUser.id,
  );

  // Step 3: Create second concurrent session from different context
  const session2Href = "https://mobile.example.com/login";
  const session2Referrer = "https://social.example.com";

  const session2: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: session2Href,
        referrer: session2Referrer,
      } satisfies ITodoAppUser.ILogin,
    });

  typia.assert(session2);
  TestValidator.equals(
    "session 2 user matches registered user",
    session2.id,
    registrationUser.id,
  );

  // Step 4: Create third concurrent session
  const session3Href = "https://desktop.example.com/login";
  const session3Referrer = "https://bookmark.example.com";

  const session3: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: session3Href,
        referrer: session3Referrer,
      } satisfies ITodoAppUser.ILogin,
    });

  typia.assert(session3);
  TestValidator.equals(
    "session 3 user matches registered user",
    session3.id,
    registrationUser.id,
  );

  // Step 5: Verify all tokens are distinct
  TestValidator.notEquals(
    "session 1 and session 2 access tokens are different",
    session1.token.access,
    session2.token.access,
  );

  TestValidator.notEquals(
    "session 1 and session 3 access tokens are different",
    session1.token.access,
    session3.token.access,
  );

  TestValidator.notEquals(
    "session 2 and session 3 access tokens are different",
    session2.token.access,
    session3.token.access,
  );

  TestValidator.notEquals(
    "session 1 and session 2 refresh tokens are different",
    session1.token.refresh,
    session2.token.refresh,
  );

  TestValidator.notEquals(
    "session 1 and session 3 refresh tokens are different",
    session1.token.refresh,
    session3.token.refresh,
  );

  TestValidator.notEquals(
    "session 2 and session 3 refresh tokens are different",
    session2.token.refresh,
    session3.token.refresh,
  );

  // Step 6: Validate token expiration timestamps
  TestValidator.predicate(
    "session 1 access token has expiration timestamp",
    new Date(session1.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "session 2 access token has expiration timestamp",
    new Date(session2.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "session 3 access token has expiration timestamp",
    new Date(session3.token.expired_at) > new Date(),
  );

  // Step 7: Validate refresh token expiration timestamps
  TestValidator.predicate(
    "session 1 refresh token has valid refreshable until timestamp",
    new Date(session1.token.refreshable_until) > new Date(),
  );

  TestValidator.predicate(
    "session 2 refresh token has valid refreshable until timestamp",
    new Date(session2.token.refreshable_until) > new Date(),
  );

  TestValidator.predicate(
    "session 3 refresh token has valid refreshable until timestamp",
    new Date(session3.token.refreshable_until) > new Date(),
  );

  // Step 8: Verify all tokens have valid JWT structure
  TestValidator.predicate(
    "session 1 access token is valid format",
    session1.token.access.split(".").length === 3,
  );

  TestValidator.predicate(
    "session 2 access token is valid format",
    session2.token.access.split(".").length === 3,
  );

  TestValidator.predicate(
    "session 3 access token is valid format",
    session3.token.access.split(".").length === 3,
  );

  TestValidator.predicate(
    "session 1 refresh token is valid format",
    session1.token.refresh.split(".").length === 3,
  );

  TestValidator.predicate(
    "session 2 refresh token is valid format",
    session2.token.refresh.split(".").length === 3,
  );

  TestValidator.predicate(
    "session 3 refresh token is valid format",
    session3.token.refresh.split(".").length === 3,
  );
}
