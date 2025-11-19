import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_guest_token_refresh(
  connection: api.IConnection,
) {
  // 1. Call guest join to create context and get tokens
  const guestJoinResponse: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IDiscussionBoardGuest.IJoin,
    });
  typia.assert(guestJoinResponse);

  // 2. Validate essential properties in join response
  TestValidator.predicate(
    "guest join returns valid guest id",
    typeof guestJoinResponse.id === "string" && guestJoinResponse.id.length > 0,
  );
  TestValidator.predicate(
    "guest join returns valid access token",
    typeof guestJoinResponse.token.access === "string" &&
      guestJoinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "guest join returns valid refresh token",
    typeof guestJoinResponse.token.refresh === "string" &&
      guestJoinResponse.token.refresh.length > 0,
  );

  // 3. Store original tokens for comparison
  const originalAccessToken = guestJoinResponse.token.access;
  const originalRefreshToken = guestJoinResponse.token.refresh;

  // 4. Call guest refresh endpoint using refresh token
  const refreshResponse: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(refreshResponse);

  // 5. Validate refreshed tokens are not empty and different from original
  TestValidator.equals(
    "guest id remains same on refresh",
    refreshResponse.id,
    guestJoinResponse.id,
  );
  TestValidator.predicate(
    "refresh returns non-empty access token",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh returns non-empty refresh token",
    refreshResponse.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token is refreshed",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token is refreshed",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );

  // No invalid refresh token test due to reasons outlined in the scenario plan
}
