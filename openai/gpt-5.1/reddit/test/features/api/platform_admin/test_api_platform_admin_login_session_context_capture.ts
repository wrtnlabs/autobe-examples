import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate platform admin login with explicit session context data.
 *
 * Business purpose:
 *
 * - Ensure a platform administrator can log in using their identifier (username
 *   or email) and password after being registered.
 * - Confirm that the login endpoint correctly accepts connection context fields
 *   (ip, href, referrer) without error as part of session creation.
 * - Verify that a full ICommunityPlatformPlatformadmin.IAuthorized payload
 *   including IAuthorizationToken is returned on success.
 *
 * Steps:
 *
 * 1. Register a new platform admin via /auth/platformAdmin/join with deterministic
 *    href/referrer values so we know what context will be associated with their
 *    initial session.
 * 2. Log out logically by creating a fresh unauthenticated connection object that
 *    does not carry the Authorization header set by the join endpoint.
 * 3. Call /auth/platformAdmin/login using the email as identifier, the same
 *    password, and explicit ip, href, and referrer strings to simulate a
 *    concrete browser login context.
 * 4. Assert that the login call succeeds and returns a
 *    ICommunityPlatformPlatformadmin.IAuthorized value.
 * 5. Perform type-level assertions on the returned authorized admin object and its
 *    nested token using typia.assert.
 * 6. Perform basic business-level validations such as checking that the
 *    id/username/email of the logged-in admin match the account created during
 *    join.
 *
 * Note: The original scenario wanted to query a sessions or audit log endpoint
 * to directly inspect the persisted community_platform_platformadmin_sessions
 * row for the login. As no such SDK function is available in the current
 * materials, this test is limited to verifying that the login endpoint accepts
 * the session-context fields and returns a successful authentication result.
 */
export async function test_api_platform_admin_login_session_context_capture(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin with deterministic context
  const joinHref: string & tags.Format<"uri"> =
    "https://admin.example.com/register";
  const joinReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com/landing";

  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.name(1);
  const password: string = RandomGenerator.alphaNumeric(16);
  const displayName: string = RandomGenerator.name();

  const joinBody = {
    username,
    email,
    password,
    displayName,
    // join ip is optional
    ip: RandomGenerator.alphaNumeric(8),
    href: joinHref,
    referrer: joinReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const joinedAdmin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(joinedAdmin);
  typia.assert<IAuthorizationToken>(joinedAdmin.token);

  // 2. Create a fresh unauthenticated connection so that login is
  //    not implicitly authorized by the join side effect.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Perform login with explicit session context fields
  const loginIp: string = "203.0.113.42";
  const loginHref: string & tags.Format<"uri"> =
    "https://admin.example.com/login";
  const loginReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com/marketing/campaign";

  const loginBody = {
    identifier: email,
    password,
    ip: loginIp,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const loggedInAdmin = await api.functional.auth.platformAdmin.login(
    unauthConnection,
    {
      body: loginBody,
    },
  );

  // 4. Type-level assertions on the returned authorized admin
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(loggedInAdmin);
  typia.assert<IAuthorizationToken>(loggedInAdmin.token);

  // 5. Business-level validations
  TestValidator.equals(
    "logged in admin id should equal joined admin id",
    loggedInAdmin.id,
    joinedAdmin.id,
  );
  TestValidator.equals(
    "logged in admin username should equal joined admin username",
    loggedInAdmin.username,
    joinedAdmin.username,
  );
  TestValidator.equals(
    "logged in admin email should equal joined admin email",
    loggedInAdmin.email,
    joinedAdmin.email,
  );
}
