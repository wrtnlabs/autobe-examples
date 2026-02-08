import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test refreshing JWT authorization tokens for a guest user.
  // 1. Perform guest join to obtain initial tokens.
  // 2. Refresh tokens using the valid refresh token.
  // 3. Validate new tokens differ from original tokens and have valid formats.
  // 1. Guest join to obtain initial authorization token
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const guestJoinResponse = await authorize_guest_join(guestJoinConnection, {
    body: {}, // ICommunityPlatformGuest.IJoin is empty
  });
  typia.assert(guestJoinResponse);
  // Create refreshed tokens connection
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  // 2. Perform token refresh
  const refreshResponse = await authorize_guest_refresh(
    guestRefreshConnection,
    {
      body: {}, // ICommunityPlatformGuest.IRefresh is empty
    },
  );
  // 3. Validate response structure and token properties
  typia.assert(refreshResponse);
  // Tokens should be different from the original tokens
  TestValidator.notEquals(
    "access token differs from original",
    refreshResponse.token.access,
    guestJoinResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token differs from original",
    refreshResponse.token.refresh,
    guestJoinResponse.token.refresh,
  );
  // Check expiration time is a valid ISO 8601 date-time string and logically valid
  const originalExpiredAt = new Date(
    guestJoinResponse.token.expired_at,
  ).getTime();
  const refreshedExpiredAt = new Date(
    refreshResponse.token.expired_at,
  ).getTime();
  TestValidator.predicate(
    "refreshed access token expiry is later than original",
    refreshedExpiredAt > originalExpiredAt,
  );
  const originalRefreshableUntil = new Date(
    guestJoinResponse.token.refreshable_until,
  ).getTime();
  const refreshedRefreshableUntil = new Date(
    refreshResponse.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshed refresh token expiry is later or equal to original",
    refreshedRefreshableUntil >= originalRefreshableUntil,
  );
  // Ensure new tokens are non-empty strings
  TestValidator.predicate(
    "access token is non-empty string",
    typeof refreshResponse.token.access === "string" &&
      refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof refreshResponse.token.refresh === "string" &&
      refreshResponse.token.refresh.length > 0,
  );
}
