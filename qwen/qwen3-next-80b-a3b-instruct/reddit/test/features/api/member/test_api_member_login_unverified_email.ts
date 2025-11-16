import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_login_unverified_email(
  connection: api.IConnection,
) {
  // Step 1: Create an unverified member account using join endpoint
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const joinData = {
    email: memberEmail,
    password: "StrongPass123!@#",
    href: "https://community-platform.com/join",
    referrer: "https://community-platform.com",
    ip: "192.168.1.100",
  } satisfies IMember.ICreate;

  const createdMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinData,
    });
  typia.assert(createdMember);

  // Step 2: Use the same member credentials to login (validating unverified email can still login)
  const loginData = {
    email: memberEmail,
    password: "StrongPass123!@#",
    href: "https://community-platform.com/login",
    referrer: "https://community-platform.com/",
    ip: "192.168.1.100",
  } satisfies IMember.ILogin;

  const loginResult: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginData,
    });
  typia.assert(loginResult);

  // Step 3: Validate that login was successful and returned a valid token
  TestValidator.equals(
    "member id matches after join and login",
    createdMember.id,
    loginResult.id,
  );
  TestValidator.equals(
    "email matches after join and login",
    createdMember.email,
    loginResult.email,
  );
  TestValidator.predicate(
    "token exists after login",
    () => loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists after login",
    () => loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration",
    () => loginResult.token.expired_at !== null,
  );
  TestValidator.predicate(
    "refresh token has expiration",
    () => loginResult.token.refreshable_until !== null,
  );
}
