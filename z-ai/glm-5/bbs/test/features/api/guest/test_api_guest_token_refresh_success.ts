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

/**
 * Test successful guest token refresh workflow.
 *
 * Validates that:
 * 1. A guest can join and obtain initial tokens
 * 2. The refresh token can be used to obtain new tokens
 * 3. New access and refresh tokens are generated with updated expiration
 * 4. Guest ID remains consistent across join and refresh operations
 * 5. Old refresh token is invalidated after use (single-use pattern)
 */
export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Guest joins to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(joinResponse);
  const originalGuestId = joinResponse.id;
  const originalRefreshToken = joinResponse.token.refresh;
  const originalAccessToken = joinResponse.token.access;
  // Step 2: Use refresh token to obtain new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IDiscussionBoardGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // Step 3: Validate response structure and guest ID consistency
  TestValidator.equals("guest ID matches", refreshResponse.id, originalGuestId);
  // Step 4: Validate new tokens are different from original tokens
  TestValidator.notEquals(
    "access token changed",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token changed",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // Step 5: Validate expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(refreshResponse.token.expired_at);
  const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate("expired_at is in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // Step 6: Verify old refresh token is invalidated (single-use pattern)
  await TestValidator.error(
    "old refresh token should be invalidated",
    async () => {
      const reuseConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(reuseConnection, {
        body: {
          refresh: originalRefreshToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );
}
