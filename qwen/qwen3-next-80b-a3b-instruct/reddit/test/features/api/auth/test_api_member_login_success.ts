import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account with valid credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: joinInput });
  typia.assert(registeredMember);
  // Step 2: Test successful login with the newly created credentials
  const loginInput = {
    email: registeredMember.email,
    password: joinInput.password,
  } satisfies ICommunityPlatformMember.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_login(loginConnection, { body: loginInput });
  typia.assert(loggedInMember);
  // Step 3: Validate all expected properties in the login response
  TestValidator.equals(
    "member ID matches",
    loggedInMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "member email matches",
    loggedInMember.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "created_at matches",
    loggedInMember.createdAt,
    registeredMember.createdAt,
  );
  TestValidator.predicate(
    "lastLoginAt is a valid date-time",
    loggedInMember.lastLoginAt !== null &&
      new Date(loggedInMember.lastLoginAt).toISOString() ===
        loggedInMember.lastLoginAt,
  );
  // Step 4: Validate token structure and expiration values
  TestValidator.equals(
    "access token exists",
    loggedInMember.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    loggedInMember.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "expired_at is a valid date-time",
    loggedInMember.token.expired_at !== undefined &&
      new Date(loggedInMember.token.expired_at).toISOString() ===
        loggedInMember.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until is a valid date-time",
    loggedInMember.token.refreshable_until !== undefined &&
      new Date(loggedInMember.token.refreshable_until).toISOString() ===
        loggedInMember.token.refreshable_until,
  );
  // Verify refreshable_until is after expired_at (business logic)
  const expiredAt = new Date(loggedInMember.token.expired_at);
  const refreshableUntil = new Date(loggedInMember.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
}
