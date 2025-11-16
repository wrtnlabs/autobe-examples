import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Verify memberUser login with email identifier.
 *
 * Business goal: Ensure that the member user authentication endpoint
 * `/auth/memberUser/login` correctly accepts the member's email address as the
 * `identifier`, not only the username, and that it returns an
 * `ICommunityPlatformMemberuser.IAuthorized` for the same account created via
 * the join flow without creating any duplicate accounts.
 *
 * Test steps:
 *
 * 1. Register a new member user via `api.functional.auth.memberUser.join` using a
 *    random but well-formed username and email plus a fixed password. Provide
 *    realistic `href` and `referrer` URI values as required by `IJoin`.
 * 2. Immediately invoke `api.functional.auth.memberUser.login`, passing an
 *    `ILogin` body where:
 *
 *    - `identifier` is set to the exact email used in the join step.
 *    - `password` is the same password as in the join step.
 *    - `href` and `referrer` are valid URI strings (can differ from join).
 * 3. Assert that the login call succeeds and returns an
 *    `ICommunityPlatformMemberuser.IAuthorized` object.
 * 4. Validate that key identity fields of the login result match the account
 *    returned from join:
 *
 *    - `id` is equal.
 *    - `username` is equal.
 *    - `email` is equal.
 * 5. Validate basic security-related fields to ensure no unintended side effects:
 *
 *    - `failed_login_count` is `0` after a successful login.
 *    - `locked_until` is `null` (no active lockout window).
 * 6. Optionally, assert that the token bundle in both responses is structurally
 *    valid using `typia.assert`, without inspecting specific token strings.
 */
export async function test_api_memberuser_login_with_email_identifier(
  connection: api.IConnection,
) {
  // 1. Register a new member user using join API
  const password: string = "P@ssw0rd!";

  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password,
    // ip is optional and can be omitted; let server infer when needed
    href: "https://frontend.example.com/auth/join",
    referrer: "https://frontend.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joined);

  // 2. Login using email as identifier
  const loginBody = {
    identifier: joinBody.email,
    password,
    // Again provide realistic href/referrer values
    href: "https://frontend.example.com/auth/login",
    referrer: "https://frontend.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const loggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(loggedIn);

  // 3. Validate the same account is returned
  TestValidator.equals(
    "login with email returns same memberUser id",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "login with email returns same username",
    loggedIn.username,
    joined.username,
  );
  TestValidator.equals(
    "login with email returns same email",
    loggedIn.email,
    joined.email,
  );

  // 4. Validate basic security state invariants after successful login
  TestValidator.equals(
    "failed_login_count is reset to 0 after successful login",
    loggedIn.failed_login_count,
    0,
  );
  TestValidator.equals(
    "locked_until is null after successful login",
    loggedIn.locked_until ?? null,
    null,
  );

  // 5. Basic sanity on token structures (already covered by typia.assert above)
  // but keep explicit assertions for clarity.
  typia.assert<IAuthorizationToken>(joined.token);
  typia.assert<IAuthorizationToken>(loggedIn.token);
}
