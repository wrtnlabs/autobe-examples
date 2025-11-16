import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Verify that a freshly-joined adminUser can successfully authenticate via the
 * dedicated admin login endpoint and receive an authorized JWT context.
 *
 * Business purpose:
 *
 * - Ensure that the admin join and login endpoints are wired together correctly:
 *   a newly created adminUser should be able to log in using their chosen
 *   identifier and password.
 * - Validate the response contract of ICommunityPlatformAdminuser.IAuthorized and
 *   its nested IAuthorizationToken, ensuring the client can rely on the
 *   returned identity and token metadata.
 *
 * Test steps:
 *
 * 1. Call POST /auth/adminUser/join to register a new adminUser using
 *    ICommunityPlatformAdminUserJoin.IRequest with random but valid username,
 *    email, and password values.
 * 2. Call POST /auth/adminUser/login to authenticate using the same identifier
 *    (use email) and password, plus realistic href and referrer URI values, and
 *    omit ip so that the server may infer it.
 * 3. Assert that the login response matches
 *    ICommunityPlatformAdminuser.IAuthorized using typia.assert, and that
 *    identity fields align between join and login responses.
 * 4. Assert that the embedded IAuthorizationToken fields are non-empty strings so
 *    that clients can safely attach them in Authorization headers or refresh
 *    flows.
 */
export async function test_api_admin_user_login_success(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser via join endpoint
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const joined = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(joined);

  // 2. Perform login using same identifier (email) and password
  const loginBody = {
    identifier: joinBody.email,
    password: joinBody.password,
    // Omit ip: let server infer from HTTP request
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const loggedIn = await api.functional.auth.adminUser.login(connection, {
    body: loginBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(loggedIn);

  // 3. Validate identity consistency between join and login responses
  TestValidator.equals(
    "joined and logged-in admin ids should match",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "joined and logged-in usernames should match",
    loggedIn.username,
    joined.username,
  );
  TestValidator.equals(
    "joined and logged-in emails should match",
    loggedIn.email,
    joined.email,
  );

  // 4. Validate token structure and basic semantics
  const token: IAuthorizationToken = loggedIn.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token should be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    token.refresh.length > 0,
  );
}
