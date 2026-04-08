import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login with valid credentials.
 *
 * Validates the complete member authentication flow including registration, login, and token generation. Ensures that the member account is properly created with valid credentials and that the authentication response contains all required identity fields and JWT tokens.
 *
 * Special attention is given to verifying that the JWT tokens contain proper expiration metadata and that the member identity fields are correctly populated from the database.
 *
 * 1. Register a new member account with unique email, password, and username.
 * 2. Login with the registered email and password credentials.
 * 3. Verify successful authentication response with member identity fields.
 * 4. Validate JWT token structure and expiration timing.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account with randomized credentials
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinUsername =
    RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3);
  const joinHref = typia.random<string & tags.Format<"uri">>();
  const joinReferrer = typia.random<string & tags.Format<"uri">>();
  const joinIp = typia.random<string & tags.Format<"ipv4">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      username: joinUsername,
      href: joinHref,
      referrer: joinReferrer,
      ip: joinIp,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinOutput);
  // Step 2: Login with registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput = await authorize_member_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IRedditPlatformMember.ILogin,
  });
  typia.assert(loginOutput);
  // Step 3: Validate member identity fields
  TestValidator.equals(
    "member id is valid uuid",
    joinOutput.id,
    loginOutput.id,
  );
  TestValidator.equals(
    "member username matches registration",
    joinOutput.username,
    loginOutput.username,
  );
  TestValidator.equals(
    "member email matches registration",
    joinOutput.email,
    loginOutput.email,
  );
  TestValidator.equals("karma starts at 0", loginOutput.karma, 0);
  TestValidator.equals(
    "created_at exists and is valid datetime",
    loginOutput.created_at,
    joinOutput.created_at,
  );
  TestValidator.equals(
    "updated_at exists and matches created_at",
    loginOutput.updated_at,
    joinOutput.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null (active account)",
    loginOutput.deleted_at,
    null,
  );
  // Step 4: Validate JWT token structure
  const hasAccessToken = loginOutput.token.access.length > 0;
  const hasRefreshToken = loginOutput.token.refresh.length > 0;
  const hasExpiredAt = loginOutput.token.expired_at !== undefined;
  const hasRefreshableUntil = loginOutput.token.refreshable_until !== undefined;
  TestValidator.predicate("access token is non-empty", hasAccessToken);
  TestValidator.predicate("refresh token is non-empty", hasRefreshToken);
  TestValidator.predicate("expired_at exists", hasExpiredAt);
  TestValidator.predicate("refreshable_until exists", hasRefreshableUntil);
  // Step 5: Validate token expiration timing (access token expires in ~1 hour)
  const accessTokenExpiry = new Date(loginOutput.token.expired_at);
  const loginTime = new Date();
  const timeDiffMs = accessTokenExpiry.getTime() - loginTime.getTime();
  TestValidator.predicate(
    "access token expires in ~1 hour",
    timeDiffMs > 0 && timeDiffMs < 70 * 60 * 1000,
  );
  // Step 6: Validate refreshable_until is after expired_at
  const refreshableUntil = new Date(loginOutput.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > accessTokenExpiry,
  );
  // Step 7: Verify connection headers are updated with access token
  TestValidator.predicate(
    "connection headers include authorization",
    loginConnection.headers !== undefined &&
      loginConnection.headers.authorization !== undefined,
  );
}
