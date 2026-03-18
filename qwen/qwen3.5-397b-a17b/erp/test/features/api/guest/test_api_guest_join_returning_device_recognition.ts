import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test returning guest recognition by device fingerprint.
 *
 * This test verifies that when a guest with an existing device fingerprint
 * attempts to join again, the system recognizes them as the same guest
 * and issues new session tokens without creating a duplicate account.
 *
 * Test Steps:
 * 1. Register a new guest with a unique device fingerprint
 * 2. Store the guest ID and initial session count
 * 3. Call join again with the same device fingerprint but different metadata
 * 4. Verify same guest ID is returned with new tokens
 * 5. Verify session count increased by 1
 */
export async function test_api_guest_join_returning_device_recognition(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First registration - create a new guest
  const guestConnection1: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const firstHref = typia.random<string & tags.Format<"uri">>();
  const firstReferrer = typia.random<string & tags.Format<"uri">>();
  const firstIp = typia.random<string & tags.Format<"ipv4">>();
  const firstJoin = await authorize_guest_join(guestConnection1, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: firstHref,
      referrer: firstReferrer,
      ip: firstIp,
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(firstJoin);
  // Store initial guest data
  const guestId = firstJoin.id;
  const firstSessionCount = firstJoin.sessions.length;
  const firstAccessToken = firstJoin.token.access;
  const firstCreatedAt = firstJoin.created_at;
  const firstUpdatedAt = firstJoin.updated_at;
  // Step 2: Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 3: Second join with same device fingerprint but different metadata
  const guestConnection2: api.IConnection = { host: connection.host };
  const secondHref = typia.random<string & tags.Format<"uri">>();
  const secondReferrer = typia.random<string & tags.Format<"uri">>();
  const secondIp = typia.random<string & tags.Format<"ipv4">>();
  const secondJoin = await authorize_guest_join(guestConnection2, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: secondHref,
      referrer: secondReferrer,
      ip: secondIp,
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(secondJoin);
  // Step 4: Verify same guest ID is returned (no duplicate created)
  TestValidator.equals("guest ID matches", secondJoin.id, guestId);
  // Step 5: Verify new tokens are issued (different from first)
  TestValidator.notEquals(
    "access token refreshed",
    secondJoin.token.access,
    firstAccessToken,
  );
  TestValidator.notEquals(
    "refresh token refreshed",
    secondJoin.token.refresh,
    firstJoin.token.refresh,
  );
  // Step 6: Verify session count increased by 1
  TestValidator.equals(
    "session count increased",
    secondJoin.sessions.length,
    firstSessionCount + 1,
  );
  // Step 7: Verify guest updated_at timestamp changed
  TestValidator.notEquals(
    "guest updated_at changed",
    secondJoin.updated_at,
    firstUpdatedAt,
  );
  // Step 8: Verify the new session has the new metadata
  const newSession = secondJoin.sessions[secondJoin.sessions.length - 1];
  typia.assertGuard(newSession!);
  TestValidator.equals("new session href", newSession.href, secondHref);
  TestValidator.equals(
    "new session referrer",
    newSession.referrer,
    secondReferrer,
  );
  TestValidator.equals("new session ip", newSession.ip, secondIp);
  // Step 9: Verify created_at remains the same (same guest account)
  TestValidator.equals(
    "guest created_at unchanged",
    secondJoin.created_at,
    firstCreatedAt,
  );
  // Step 10: Verify deleted_at is still null
  TestValidator.equals("guest not deleted", secondJoin.deleted_at, null);
}
