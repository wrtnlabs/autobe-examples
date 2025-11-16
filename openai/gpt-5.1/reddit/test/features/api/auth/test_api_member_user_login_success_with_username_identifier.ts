import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate successful member user login using username identifier.
 *
 * Business flow:
 *
 * 1. Join a new member user via /auth/memberUser/join and capture username and
 *    password.
 * 2. Login via /auth/memberUser/login using identifier = username and the same
 *    password.
 * 3. Verify that the login succeeds and returns IAuthorized with consistent
 *    identity info.
 * 4. Ensure JWT token structure is valid and core identity fields match between
 *    join and login.
 */
export async function test_api_member_user_login_success_with_username_identifier(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const joinPassword = "P@ssw0rd123!";

  const joinRequestBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: joinPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const joinAuthorized = await api.functional.auth.memberUser.join(connection, {
    body: joinRequestBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joinAuthorized);
  typia.assert<IAuthorizationToken>(joinAuthorized.token);

  const joinedId = joinAuthorized.id;
  const joinedUsername = joinAuthorized.username;
  const joinedEmail = joinAuthorized.email;
  const joinedStatusCode = joinAuthorized.statusCode;
  const joinedAccountStatusKey = joinAuthorized.accountStatusKey;

  // 2. Login using username as identifier
  const loginRequestBody = {
    identifier: joinedUsername,
    password: joinPassword,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const loginAuthorized = await api.functional.auth.memberUser.login(
    connection,
    {
      body: loginRequestBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(loginAuthorized);
  typia.assert<IAuthorizationToken>(loginAuthorized.token);

  // 3. Compare identity consistency between join and login
  TestValidator.equals(
    "member id should be consistent between join and username login",
    loginAuthorized.id,
    joinedId,
  );
  TestValidator.equals(
    "username should be consistent between join and username login",
    loginAuthorized.username,
    joinedUsername,
  );
  TestValidator.equals(
    "email should be consistent between join and username login",
    loginAuthorized.email,
    joinedEmail,
  );
  TestValidator.equals(
    "statusCode should be consistent between join and username login",
    loginAuthorized.statusCode,
    joinedStatusCode,
  );
  TestValidator.equals(
    "accountStatusKey should be consistent when defined",
    loginAuthorized.accountStatusKey,
    joinedAccountStatusKey,
  );

  // displayName and avatarUrl are optional; when both exist, validate equality
  if (
    joinAuthorized.displayName !== undefined &&
    loginAuthorized.displayName !== undefined
  ) {
    TestValidator.equals(
      "displayName should be consistent when present",
      loginAuthorized.displayName,
      joinAuthorized.displayName,
    );
  }
  if (
    joinAuthorized.avatarUrl !== undefined &&
    loginAuthorized.avatarUrl !== undefined
  ) {
    TestValidator.equals(
      "avatarUrl should be consistent when present",
      loginAuthorized.avatarUrl,
      joinAuthorized.avatarUrl,
    );
  }

  // 4. Validate that tokens are non-empty strings
  TestValidator.predicate(
    "login token.access should be a non-empty string",
    loginAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token.refresh should be a non-empty string",
    loginAuthorized.token.refresh.length > 0,
  );

  // Optional accessToken / refreshToken fields on IAuthorized
  if (loginAuthorized.accessToken !== undefined) {
    TestValidator.predicate(
      "login accessToken, when present, should be non-empty",
      loginAuthorized.accessToken.length > 0,
    );
  }
  if (loginAuthorized.refreshToken !== undefined) {
    TestValidator.predicate(
      "login refreshToken, when present, should be non-empty",
      loginAuthorized.refreshToken.length > 0,
    );
  }

  // 5. Sensitive data: password is never returned in IAuthorized,
  // guaranteed by DTO shape and typia.assert, so no explicit checks needed here.
}
