import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

export async function test_api_contributor_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account to obtain initial tokens
  const createData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardContributor.ICreate;

  const registeredContributor = await api.functional.auth.contributor.join(
    connection,
    {
      body: createData,
    },
  );
  typia.assert(registeredContributor);

  // Validate the registered contributor has proper structure
  TestValidator.predicate(
    "registered contributor should have ID",
    registeredContributor.id !== null && registeredContributor.id !== undefined,
  );
  TestValidator.predicate(
    "registered contributor should have active status",
    registeredContributor.account_status === "active",
  );
  TestValidator.predicate(
    "registered contributor should have initial tokens",
    registeredContributor.token !== null &&
      registeredContributor.token !== undefined,
  );

  // Step 2: Extract refresh token from initial authentication
  const initialRefreshToken = registeredContributor.token.refresh;
  const initialAccessToken = registeredContributor.token.access;
  const initialExpiredAt = new Date(registeredContributor.token.expired_at);

  TestValidator.predicate(
    "initial access token should exist",
    initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token should exist",
    initialRefreshToken.length > 0,
  );

  // Step 3: Use refresh token to get new tokens
  const refreshData = {
    refreshToken: initialRefreshToken,
  } satisfies IDiscussionBoardContributor.IRefresh;

  const refreshedContributor = await api.functional.auth.contributor.refresh(
    connection,
    {
      body: refreshData,
    },
  );
  typia.assert(refreshedContributor);

  // Step 4: Validate new tokens are different from initial tokens
  TestValidator.notEquals(
    "new access token should differ from initial",
    refreshedContributor.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token should differ from initial",
    refreshedContributor.token.refresh,
    initialRefreshToken,
  );

  // Step 5: Validate new token expiration times
  const newExpiredAt = new Date(refreshedContributor.token.expired_at);
  const newRefreshableUntil = new Date(
    refreshedContributor.token.refreshable_until,
  );

  TestValidator.predicate(
    "new access token expiration should be after initial",
    newExpiredAt.getTime() > initialExpiredAt.getTime(),
  );

  // Step 6: Verify token validity windows
  const now = new Date();
  const thirtyMinutesMs = 30 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const accessTokenDuration = newExpiredAt.getTime() - now.getTime();
  TestValidator.predicate(
    "access token should be valid for approximately 30 minutes",
    accessTokenDuration > thirtyMinutesMs - 60000 &&
      accessTokenDuration <= thirtyMinutesMs,
  );

  const refreshTokenDuration = newRefreshableUntil.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token should extend session for approximately 7 days",
    refreshTokenDuration > sevenDaysMs - 60000 &&
      refreshTokenDuration <= sevenDaysMs,
  );

  // Step 7: Validate contributor account information is consistent
  TestValidator.equals(
    "contributor ID should remain unchanged",
    refreshedContributor.id,
    registeredContributor.id,
  );
  TestValidator.equals(
    "contributor email should remain unchanged",
    refreshedContributor.email,
    registeredContributor.email,
  );
  TestValidator.equals(
    "contributor username should remain unchanged",
    refreshedContributor.username,
    registeredContributor.username,
  );
  TestValidator.equals(
    "account status should remain active",
    refreshedContributor.account_status,
    "active",
  );
}
