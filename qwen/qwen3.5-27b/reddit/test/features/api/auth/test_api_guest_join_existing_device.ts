import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session renewal with existing device fingerprint.
 *
 * Validates that when a guest returns with the same device fingerprint, the system recognizes them as an existing guest and issues new session tokens while maintaining the original account identity. Ensures session continuity for returning guests without requiring re-authentication.
 *
 * The test verifies that the guest account ID remains unchanged, timestamps are properly updated, and new tokens are generated while preserving the original creation timestamp.
 *
 * 1. Create initial guest account with specific device fingerprint.
 * 2. Wait briefly to simulate time passing between sessions.
 * 3. Rejoin with the same device fingerprint.
 * 4. Verify guest identity preservation (same ID, device fingerprint, created_at).
 * 5. Verify updated_at reflects the second join operation.
 * 6. Verify sessions array contains both old and new sessions.
 * 7. Verify new tokens are different from initial tokens.
 * 8. Verify token expiration timestamps are correctly set.
 */
export async function test_api_guest_join_existing_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest account
  const guestConnection1: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const firstJoin = await authorize_guest_join(guestConnection1, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(firstJoin);
  const firstGuestId = firstJoin.id;
  const firstCreatedAt = firstJoin.created_at;
  const firstAccessToken = firstJoin.token.access;
  const firstRefreshToken = firstJoin.token.refresh;
  // 2. Wait briefly to simulate time passing
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Rejoin with the same device fingerprint
  const guestConnection2: api.IConnection = { host: connection.host };
  const secondJoin = await authorize_guest_join(guestConnection2, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(secondJoin);
  // 4. Verify guest identity preservation
  TestValidator.equals("guest ID unchanged", secondJoin.id, firstGuestId);
  TestValidator.equals(
    "device fingerprint unchanged",
    secondJoin.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.equals(
    "created_at unchanged",
    secondJoin.created_at,
    firstCreatedAt,
  );
  // 5. Verify updated_at reflects the second join
  TestValidator.notEquals(
    "updated_at changed",
    secondJoin.updated_at,
    firstJoin.updated_at,
  );
  // 6. Verify account is active
  TestValidator.equals("deleted_at is null", secondJoin.deleted_at, null);
  // 7. Verify sessions array contains both sessions
  TestValidator.predicate(
    "has at least 2 sessions",
    secondJoin.sessions.length >= 2,
  );
  // 8. Verify new tokens are different
  TestValidator.notEquals(
    "access token is new",
    secondJoin.token.access,
    firstAccessToken,
  );
  TestValidator.notEquals(
    "refresh token is new",
    secondJoin.token.refresh,
    firstRefreshToken,
  );
  // 9. Verify token expiration timestamps are set
  TestValidator.predicate(
    "expired_at is set",
    secondJoin.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is set",
    secondJoin.token.refreshable_until !== undefined,
  );
  // 10. Verify expired_at is approximately 15 minutes from now
  const now = new Date();
  const expiredAt = new Date(secondJoin.token.expired_at);
  const expectedExpiredAt = new Date(now.getTime() + 15 * 60 * 1000);
  const timeDiffMs = Math.abs(
    expiredAt.getTime() - expectedExpiredAt.getTime(),
  );
  TestValidator.predicate(
    "expired_at within 1 minute of 15 minutes",
    timeDiffMs < 60 * 1000,
  );
  // 11. Verify refreshable_until is approximately 7 days from now
  const refreshableUntil = new Date(secondJoin.token.refreshable_until);
  const expectedRefreshableUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const refreshableDiffMs = Math.abs(
    refreshableUntil.getTime() - expectedRefreshableUntil.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until within 1 minute of 7 days",
    refreshableDiffMs < 60 * 1000,
  );
}
