import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * This test verifies that a member can successfully log in with valid credentials
 * and receives proper authentication tokens and profile data in response.
 *
 * Test Flow:
 * 1. Create a new member account with unique email, password, and username
 * 2. Call login endpoint with the same credentials
 * 3. Verify response contains valid tokens and profile data
 *
 * Verification Points:
 * - Response contains valid UUID id
 * - Email matches the registered email
 * - Username matches the registered username
 * - Karma is 0 for new account
 * - Access token is present
 * - Refresh token is present
 * - Expired_at timestamp is approximately 30 minutes in the future
 * - Token structure contains access, refresh, expired_at, and refreshable_until
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique credentials for testing
  const email = typia.random<string & tags.Format<"email">>();
  const password = `Password${RandomGenerator.alphaNumeric(6)}1!`;
  const username = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Step 1: Create a new member account via join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      username,
      display_name: displayName,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(joinResponse);
  // Step 2: Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(loginResponse);
  // Step 3: Verify response data
  TestValidator.equals(
    "member id is valid UUID format",
    loginResponse.id.length,
    36,
  );
  TestValidator.equals(
    "email matches",
    loginResponse.email.toLowerCase(),
    email.toLowerCase(),
  );
  TestValidator.equals("username matches", loginResponse.username, username);
  TestValidator.equals("karma is 0 for new account", loginResponse.karma, 0);
  TestValidator.predicate(
    "accessToken is present",
    loginResponse.accessToken.length > 0,
  );
  TestValidator.predicate(
    "expiredAt is present",
    loginResponse.expiredAt !== null && loginResponse.expiredAt !== undefined,
  );
  TestValidator.predicate(
    "token object is present",
    loginResponse.token !== null && loginResponse.token !== undefined,
  );
  TestValidator.predicate(
    "token.access is present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is present",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is present",
    loginResponse.token.expired_at !== null &&
      loginResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token.refreshable_until is present",
    loginResponse.token.refreshable_until !== null &&
      loginResponse.token.refreshable_until !== undefined,
  );
  // Verify expired_at is approximately 30 minutes in the future
  const expiredAt = new Date(loginResponse.expiredAt);
  const now = new Date();
  const diffMs = expiredAt.getTime() - now.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  TestValidator.predicate(
    "expired_at is approximately 30 minutes in future",
    diffMinutes > 28 && diffMinutes < 32,
  );
  // Verify token.expired_at is approximately 30 minutes in the future
  const tokenExpiredAt = new Date(loginResponse.token.expired_at);
  const tokenDiffMs = tokenExpiredAt.getTime() - now.getTime();
  const tokenDiffMinutes = tokenDiffMs / (1000 * 60);
  TestValidator.predicate(
    "token.expired_at is approximately 30 minutes in future",
    tokenDiffMinutes > 28 && tokenDiffMinutes < 32,
  );
  // Verify refreshable_until is approximately 14 days in the future
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  const refreshDiffMs = refreshableUntil.getTime() - now.getTime();
  const refreshDiffDays = refreshDiffMs / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refreshable_until is approximately 14 days in future",
    refreshDiffDays > 13 && refreshDiffDays < 15,
  );
  // Verify timestamps are present
  TestValidator.predicate(
    "created_at is present",
    loginResponse.created_at !== null && loginResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    loginResponse.updated_at !== null && loginResponse.updated_at !== undefined,
  );
}
