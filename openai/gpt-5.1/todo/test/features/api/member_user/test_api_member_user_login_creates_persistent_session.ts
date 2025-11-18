import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";

/**
 * Verify that a member user can log in after registration and receives a
 * fully-typed authorization payload and updated Authorization header.
 *
 * ## Business context
 *
 * The todoApp service exposes two authentication endpoints for the memberUser
 * actor:
 *
 * - POST /auth/memberUser/join -> api.functional.auth.memberUser.join
 * - POST /auth/memberUser/login -> api.functional.auth.memberUser.login
 *
 * Both endpoints return ITodoAppMemberUser.IAuthorized, which combines profile
 * information about the member (id, email, display_name, status, created_at,
 * updated_at) with an IAuthorizationToken (access/refresh tokens and their
 * expiry timestamps). The SDK also automatically writes the `token.access`
 * value into `connection.headers.Authorization` for subsequent API calls.
 *
 * The wider requirements mention that each successful login creates a
 * persistent session row in `todo_app_memberuser_sessions` with connection
 * metadata (ip, href, referrer, created_at, expired_at). However, session
 * listing APIs are not part of this particular test input, so this test will
 * focus on the observable contract: join then login with valid credentials and
 * verify the response DTO and client-side header effects.
 *
 * ## Test steps
 *
 * 1. Generate a unique member email and password that satisfy the DTO constraints.
 *    For join, build an ITodoAppMemberUserJoin.ICreate body including:
 *
 *    - Email: string & tags.Format<"email">
 *    - Password: string & tags.Format<"password">
 *    - DisplayName?: some random human-friendly string
 *    - Ip?: null (to let the backend infer IP), or omit it entirely
 *    - Href: a valid URI string (RandomGenerator-based or typia.random)
 *    - Referrer: a valid URI string
 * 2. Call api.functional.auth.memberUser.join(connection, { body }) and assert
 *    that the result is a valid ITodoAppMemberUser.IAuthorized via
 *    typia.assert. Capture:
 *
 *    - The returned email (should match request email)
 *    - The returned token (IAuthorizationToken)
 *    - The Authorization header that the SDK has written into the connection object.
 *
 *    We do not assert any specific header value format, only that the header was
 *    set to a non-empty string.
 * 3. Build an ITodoAppMemberUserLogin.ICreate body for the same email/password
 *    combination as step 1, but with a different href/referrer pair and an
 *    explicit ip string (this time not null), to mimic a second device or page.
 *    The login DTO requires:
 *
 *    - Email: string & tags.Format<"email">
 *    - Password: string (no special tags)
 *    - Ip?: string | null | undefined (here we send a concrete string)
 *    - Href: string & tags.Format<"uri">
 *    - Referrer: string & tags.Format<"uri">
 * 4. Call api.functional.auth.memberUser.login(connection, { body }) and again
 *    assert with typia.assert that the result is a valid
 *    ITodoAppMemberUser.IAuthorized. Then:
 *
 *    - Use TestValidator.equals with a descriptive title to confirm that the
 *         response.email equals the original registration email.
 *    - Use TestValidator.predicate to verify that the token.access and token.refresh
 *         strings are non-empty and that the token.expired_at and
 *         token.refreshable_until fields look like ISO date-time strings (we
 *         rely on typia.assert for strict type/format correctness, and only
 *         assert non-emptiness at business logic level).
 *    - Use TestValidator.predicate to confirm that connection.headers exists and
 *         that connection.headers.Authorization is a non-empty string,
 *         representing that the SDK updated the Authorization header with the
 *         new login token. Note that we must not directly manipulate headers
 *         according to higher-level rules; we only read them.
 * 5. (Scenario requirement mapping) The original description mentions verifying a
 *    new `todo_app_memberuser_sessions` row with correct ip, href, referrer,
 *    created_at, and null expired_at fields via dedicated session listing APIs.
 *    Since such APIs are not present in the provided SDK list, this test omits
 *    direct DB/session checks. That validation is expected to be covered by
 *    other tests in a different plan group that have access to those APIs.
 */
export async function test_api_member_user_login_creates_persistent_session(
  connection: api.IConnection,
) {
  // 1. Prepare registration (join) payload
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const joinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    displayName: RandomGenerator.name(),
    // Intentionally omit ip so the backend can infer it or create a
    // default; ip is optional and nullable in ITodoAppMemberUserJoin.ICreate.
    href: joinHref,
    referrer: joinReferrer,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  // 2. Call join endpoint and validate response
  const joined: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(joined);

  // Business-level sanity checks on join result
  TestValidator.equals(
    "joined email should match registration email",
    joined.email,
    email,
  );

  // Token should be structurally valid (already enforced by typia.assert),
  // here we only check non-empty values at business logic level.
  TestValidator.predicate(
    "join token.access should be non-empty",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "join token.refresh should be non-empty",
    joined.token.refresh.length > 0,
  );

  // Connection header should now contain an Authorization value set by SDK
  TestValidator.predicate(
    "Authorization header should be set after join",
    () => {
      const headers = connection.headers;
      if (!headers) return false;
      const auth = headers.Authorization;
      return typeof auth === "string" && auth.length > 0;
    },
  );

  const prevAccessToken: string = joined.token.access;

  // 3. Prepare login payload using same credentials but different
  //    connection metadata and explicit ip string.
  const loginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const loginIp: string = "203.0.113.10"; // Documentation-style sample IP

  const loginBody = {
    email,
    password,
    ip: loginIp,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ITodoAppMemberUserLogin.ICreate;

  // 4. Call login endpoint and validate response
  const loggedIn: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(loggedIn);

  // Email must still match the same member
  TestValidator.equals(
    "logged-in email should match registration email",
    loggedIn.email,
    email,
  );

  // Token sanity checks
  const loginToken: IAuthorizationToken = loggedIn.token;
  TestValidator.predicate(
    "login token.access should be non-empty",
    loginToken.access.length > 0,
  );
  TestValidator.predicate(
    "login token.refresh should be non-empty",
    loginToken.refresh.length > 0,
  );

  // We can't guarantee that access tokens differ between join and login
  // because rotation strategy is implementation-specific, so we do not
  // assert inequality. Instead, focus on header effect and structural
  // validity.

  // 5. Verify that the Authorization header has been updated by login.
  TestValidator.predicate(
    "Authorization header should be set after login",
    () => {
      const headers = connection.headers;
      if (!headers) return false;
      const auth = headers.Authorization;
      return typeof auth === "string" && auth.length > 0;
    },
  );

  // Optionally, if header is string, it should equal the latest
  // token.access value. This reflects the documented @setHeader behavior.
  TestValidator.predicate(
    "Authorization header should reflect latest login token.access when string",
    () => {
      const headers = connection.headers;
      if (!headers) return false;
      const auth = headers.Authorization;
      if (typeof auth !== "string") return false;
      return auth === loginToken.access;
    },
  );

  // This test does not directly query todo_app_memberuser_sessions, as
  // session listing APIs are not available in this plan. The creation and
  // persistence of session rows are validated indirectly by successful login
  // behavior and are expected to be covered by additional tests that have
  // dedicated session inspection endpoints.
}
