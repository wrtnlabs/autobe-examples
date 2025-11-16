import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_login_with_email_identifier(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin via /auth/platformAdmin/join
  const password: string = "P@ssw0rd-" + RandomGenerator.alphaNumeric(8);
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password,
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const joinedAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(joinedAdmin);

  // Preserve the token from join to ensure it is non-empty and valid
  const joinAccessToken: string = joinedAdmin.token.access;
  TestValidator.predicate(
    "join access token should be non-empty",
    joinAccessToken.length > 0,
  );

  // 2. Login using email as identifier (not username)
  const loginBody = {
    identifier: joinedAdmin.email,
    password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const loggedInAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(loggedInAdmin);

  // 3. Validate that login profile corresponds to joined admin
  TestValidator.equals(
    "login should return same admin id as join",
    loggedInAdmin.id,
    joinedAdmin.id,
  );
  TestValidator.equals(
    "login should return same username",
    loggedInAdmin.username,
    joinedAdmin.username,
  );
  TestValidator.equals(
    "login should return same email",
    loggedInAdmin.email,
    joinedAdmin.email,
  );
  TestValidator.equals(
    "login should return same displayName",
    loggedInAdmin.displayName,
    joinedAdmin.displayName,
  );

  // accountStatus should be a valid summary object
  typia.assert<ICommunityPlatformAccountStatus.ISummary>(
    loggedInAdmin.accountStatus,
  );

  // token should be a valid authorization token
  typia.assert<IAuthorizationToken>(loggedInAdmin.token);

  // We intentionally do not inspect connection.headers here, as header
  // management is handled internally by the SDK and is outside the
  // responsibility of E2E tests.
}
