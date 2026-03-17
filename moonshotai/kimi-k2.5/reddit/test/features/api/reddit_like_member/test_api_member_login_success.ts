import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login authentication after registration.
 *
 * 1. Register a new member account using authorize_member_join utility
 * 2. Use the registered credentials to login via authorize_member_login
 * 3. Validate IRedditLikeMember.IAuthorized response structure
 * 4. Verify member identity fields and token structure
 * 5. Ensure access and refresh tokens are different values
 * 6. Validate tokens are valid for future use
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member first to have valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12),
    password: "TestPass123!",
  } satisfies IRedditLikeMember.IJoin;
  const registeredMember = await authorize_member_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(registeredMember);
  // Step 2: Create a fresh connection and login with registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IRedditLikeMember.ILogin;
  const authorizedMember = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(authorizedMember);
  // Step 3: Validate member identity fields match registration
  TestValidator.equals(
    "member id matches registered",
    authorizedMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "member email matches login request",
    authorizedMember.email,
    loginBody.email,
  );
  TestValidator.equals(
    "member username matches registration",
    authorizedMember.username,
    registeredMember.username,
  );
  TestValidator.predicate(
    "emailVerified is boolean",
    typeof authorizedMember.emailVerified === "boolean",
  );
  // Step 4: Validate timestamps
  TestValidator.predicate(
    "createdAt is valid",
    new Date(authorizedMember.createdAt).toISOString() ===
      authorizedMember.createdAt,
  );
  TestValidator.predicate(
    "updatedAt is valid",
    new Date(authorizedMember.updatedAt).toISOString() ===
      authorizedMember.updatedAt,
  );
  TestValidator.equals("deletedAt is null", authorizedMember.deletedAt, null);
  // Step 5: Validate token structure
  TestValidator.predicate(
    "access token is non-empty",
    authorizedMember.token.access.length > 10,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorizedMember.token.refresh.length > 10,
  );
  TestValidator.notEquals(
    "access token differs from refresh token",
    authorizedMember.token.access,
    authorizedMember.token.refresh,
  );
  // Step 6: Validate token expiration timestamps are in the future
  const expiredAt = new Date(authorizedMember.token.expired_at);
  const refreshableUntil = new Date(authorizedMember.token.refreshable_until);
  const now = Date.now();
  TestValidator.predicate(
    "access token expiration is in future",
    expiredAt.getTime() > now,
  );
  TestValidator.predicate(
    "refresh token expiration is in future",
    refreshableUntil.getTime() > now,
  );
}
