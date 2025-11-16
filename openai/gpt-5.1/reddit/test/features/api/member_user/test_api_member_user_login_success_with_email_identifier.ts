import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate successful member user login using email identifier.
 *
 * Business workflow:
 *
 * 1. Register a new member user via /auth/memberUser/join with unique username,
 *    email, password, and initial session context (href, referrer, optional
 *    ip).
 * 2. Immediately attempt login via /auth/memberUser/login using the same email as
 *    identifier and the same password, plus realistic optional session
 *    metadata.
 * 3. Assert both responses conform to ICommunityPlatformMemberuser.IAuthorized.
 * 4. Verify that identity fields (id, username, email) are consistent between join
 *    and login responses.
 * 5. Verify that a new token object is issued on login by checking that either
 *    access or refresh token differs from the join response.
 */
export async function test_api_member_user_login_success_with_email_identifier(
  connection: api.IConnection,
) {
  // 1. Prepare stable, realistic registration data
  const username: string = RandomGenerator.name(1);
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = "Str0ngP@ssw0rd!";

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip: string = "203.0.113.10";

  const joinBody = {
    username,
    email,
    password,
    ip,
    href,
    referrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  // 2. Call join endpoint to create a new member user
  const joinAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joinAuthorized);

  // Basic sanity checks on join response identity and token
  TestValidator.predicate(
    "join: id must be non-empty string",
    typeof joinAuthorized.id === "string" && joinAuthorized.id.length > 0,
  );
  TestValidator.equals(
    "join: username echoes request",
    joinAuthorized.username,
    username,
  );
  TestValidator.equals(
    "join: email echoes request",
    joinAuthorized.email,
    email,
  );
  TestValidator.predicate(
    "join: token.access must be non-empty",
    typeof joinAuthorized.token.access === "string" &&
      joinAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "join: token.refresh must be non-empty",
    typeof joinAuthorized.token.refresh === "string" &&
      joinAuthorized.token.refresh.length > 0,
  );

  const joinAccessToken: string = joinAuthorized.token.access;
  const joinRefreshToken: string = joinAuthorized.token.refresh;

  // 3. Build login payload using email identifier and same password
  const loginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginIp: string = "198.51.100.42";

  const loginBody = {
    identifier: email,
    password,
    ip: loginIp,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  // 4. Call login endpoint for the same credentials
  const loginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(loginAuthorized);

  // 5. Identity consistency: id, username, email must match join response
  TestValidator.equals(
    "login: id matches join",
    loginAuthorized.id,
    joinAuthorized.id,
  );
  TestValidator.equals(
    "login: username matches join",
    loginAuthorized.username,
    joinAuthorized.username,
  );
  TestValidator.equals(
    "login: email matches join",
    loginAuthorized.email,
    joinAuthorized.email,
  );

  // Ensure login also provides non-empty tokens
  TestValidator.predicate(
    "login: token.access must be non-empty",
    typeof loginAuthorized.token.access === "string" &&
      loginAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "login: token.refresh must be non-empty",
    typeof loginAuthorized.token.refresh === "string" &&
      loginAuthorized.token.refresh.length > 0,
  );

  // At least one of access/refresh should differ, indicating new token issuance
  const isAccessChanged: boolean =
    loginAuthorized.token.access !== joinAccessToken;
  const isRefreshChanged: boolean =
    loginAuthorized.token.refresh !== joinRefreshToken;

  TestValidator.predicate(
    "login: at least one of access or refresh token is rotated",
    isAccessChanged || isRefreshChanged,
  );
}
