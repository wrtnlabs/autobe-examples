import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate member user login captures and uses session context fields.
 *
 * Business goal:
 *
 * - Ensure that a member user who has just registered (join) can subsequently
 *   authenticate (login) using the configured identifier and password.
 * - Confirm that session-context fields (ip, href, referrer) can be supplied on
 *   both join and login requests without causing errors and that login returns
 *   a complete authorization envelope with tokens.
 * - Exercise both the explicit-ip and omitted-ip variants of the login workflow
 *   while keeping href/referrer populated to simulate analytics context.
 *
 * What we can observe from E2E tests:
 *
 * - Successful join and login operations that return
 *   ICommunityPlatformMemberuser.IAuthorized objects.
 * - Consistency of identity fields (id, username, email) between join and login
 *   responses.
 * - Presence of token and embedded IAuthorizationToken in all responses.
 * - That providing or omitting optional ip does not break the login flow when
 *   href/referrer are provided.
 *
 * Limitations:
 *
 * - The test cannot directly inspect database tables such as
 *   community_platform_memberuser_sessions or
 *   community_platform_user_security_events. Instead, it validates behavior
 *   indirectly via successful responses and identity consistency.
 */
export async function test_api_member_user_login_captures_session_context(
  connection: api.IConnection,
) {
  // 1. Prepare deterministic but random-looking credentials and URLs.
  const username: string = `user_${RandomGenerator.alphaNumeric(12)}`;
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);

  const joinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const joinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const joinIp: string = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

  // 2. Join (register) a new member user with full session context.
  const joinBody = {
    username,
    email,
    password,
    ip: joinIp,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Basic business assertions on join result.
  TestValidator.equals(
    "joined username should match request username",
    joined.username,
    username,
  );
  TestValidator.equals(
    "joined email should match request email",
    joined.email,
    email,
  );
  TestValidator.predicate(
    "joined response should contain non-empty access token string",
    typeof joined.token.access === "string" && joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined response should contain non-empty refresh token string",
    typeof joined.token.refresh === "string" && joined.token.refresh.length > 0,
  );

  // 3. Login with explicit ip, href, and referrer.
  const loginHrefExplicit: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrerExplicit: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginIpExplicit: string = `198.51.100.${
    Math.floor(Math.random() * 200) + 1
  }`;

  const loginExplicitBody = {
    identifier: email,
    password,
    ip: loginIpExplicit,
    href: loginHrefExplicit,
    referrer: loginReferrerExplicit,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const loginExplicit: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginExplicitBody,
    });
  typia.assert(loginExplicit);

  // Assert identity consistency between join and login responses.
  TestValidator.equals(
    "login (explicit ip) id should match joined id",
    loginExplicit.id,
    joined.id,
  );
  TestValidator.equals(
    "login (explicit ip) username should match joined username",
    loginExplicit.username,
    joined.username,
  );
  TestValidator.equals(
    "login (explicit ip) email should match joined email",
    loginExplicit.email,
    joined.email,
  );

  // Tokens should be present in login response as well.
  TestValidator.predicate(
    "login (explicit ip) should contain non-empty access token string",
    typeof loginExplicit.token.access === "string" &&
      loginExplicit.token.access.length > 0,
  );
  TestValidator.predicate(
    "login (explicit ip) should contain non-empty refresh token string",
    typeof loginExplicit.token.refresh === "string" &&
      loginExplicit.token.refresh.length > 0,
  );

  // 4. Login again without providing ip (ip omitted), but with href/referrer.
  const loginHrefNoIp: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrerNoIp: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const loginNoIpBody = {
    identifier: email,
    password,
    href: loginHrefNoIp,
    referrer: loginReferrerNoIp,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const loginNoIp: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginNoIpBody,
    });
  typia.assert(loginNoIp);

  // Identity must still match joined user even when ip is omitted.
  TestValidator.equals(
    "login (no ip) id should match joined id",
    loginNoIp.id,
    joined.id,
  );
  TestValidator.equals(
    "login (no ip) username should match joined username",
    loginNoIp.username,
    joined.username,
  );
  TestValidator.equals(
    "login (no ip) email should match joined email",
    loginNoIp.email,
    joined.email,
  );

  // Tokens should also be present in the no-ip login response.
  TestValidator.predicate(
    "login (no ip) should contain non-empty access token string",
    typeof loginNoIp.token.access === "string" &&
      loginNoIp.token.access.length > 0,
  );
  TestValidator.predicate(
    "login (no ip) should contain non-empty refresh token string",
    typeof loginNoIp.token.refresh === "string" &&
      loginNoIp.token.refresh.length > 0,
  );
}
