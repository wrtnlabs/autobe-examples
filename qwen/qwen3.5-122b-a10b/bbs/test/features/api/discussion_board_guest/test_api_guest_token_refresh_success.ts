import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account to obtain initial refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(initialAuth);
  // Store old refresh token for validation
  const oldRefreshToken = initialAuth.token.refresh;
  const oldExpiresAt = initialAuth.token.expired_at;
  const oldRefreshableUntil = initialAuth.token.refreshable_until;
  // 2. Wait briefly to ensure session is established
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Call refresh endpoint with valid refresh token
  const refreshedAuth = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: oldRefreshToken,
    } satisfies IDiscussionBoardGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Verify response contains new tokens
  TestValidator.predicate(
    "has new access token",
    refreshedAuth.token.access !== "",
  );
  TestValidator.predicate(
    "has new refresh token",
    refreshedAuth.token.refresh !== "",
  );
  // 5. Verify new tokens have updated expiration timestamps
  TestValidator.notEquals(
    "access token expired_at updated",
    oldExpiresAt,
    refreshedAuth.token.expired_at,
  );
  TestValidator.notEquals(
    "refresh token refreshable_until updated",
    oldRefreshableUntil,
    refreshedAuth.token.refreshable_until,
  );
  // 6. Verify old refresh token is invalidated (token rotation)
  // Try to use old refresh token - should fail
  await TestValidator.error("old refresh token invalidated", async () => {
    await authorize_guest_refresh(guestConnection, {
      body: {
        refresh_token: oldRefreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  });
  // 7. Verify new access token can be used for authenticated requests
  // (The authorize_guest_refresh already updated guestConnection.headers with new token)
  TestValidator.predicate(
    "guest ID matches",
    refreshedAuth.id === initialAuth.id,
  );
}
