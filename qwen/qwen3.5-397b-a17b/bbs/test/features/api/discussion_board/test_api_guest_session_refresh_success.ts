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
 * Test guest session refresh success workflow.
 *
 * This test validates the complete guest session refresh flow:
 * 1. Guest registers via join endpoint to obtain initial JWT tokens
 * 2. Guest uses the refresh token to request new credentials
 * 3. System issues new access and refresh tokens with updated expiration times
 * 4. Guest ID remains consistent across the refresh operation
 */
export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register guest to obtain initial authentication tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(initialAuth);
  // Step 2: Extract refresh token from initial authentication
  const refreshToken = initialAuth.token.refresh;
  const originalGuestId = initialAuth.id;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // Step 3: Refresh the guest session using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IDiscussionBoardGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 4: Validate guest ID remains consistent after refresh
  TestValidator.equals("guest id matches", refreshedAuth.id, originalGuestId);
  // Step 5: Validate tokens were rotated (new tokens differ from old ones)
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    refreshToken,
  );
  // Step 6: Validate expiration times are updated (new session has later expiration)
  TestValidator.predicate(
    "expired_at is updated",
    refreshedAuth.token.expired_at >= initialExpiredAt,
  );
  TestValidator.predicate(
    "refreshable_until is updated",
    refreshedAuth.token.refreshable_until >= initialRefreshableUntil,
  );
}
