import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session refresh with metadata update capability.
 *
 * This test validates that when a guest session is refreshed, the optional
 * metadata fields (ip, href, referrer) can be updated in the new session record.
 *
 * Test flow:
 * 1. Join as guest with initial metadata (ip, href, referrer)
 * 2. Validate initial session contains the baseline metadata
 * 3. Refresh session with new metadata values
 * 4. Validate new session record has updated metadata
 * 5. Verify token rotation occurred (new access and refresh tokens)
 * 6. Verify session lifetime was extended (new expired_at is later)
 * 7. Verify guest identity preserved (same id and device_fingerprint)
 */
export async function test_api_guest_session_refresh_metadata_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Initial guest join with baseline metadata
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(16);
  const initialHref = typia.random<string & tags.Format<"uri">>();
  const initialReferrer = typia.random<string & tags.Format<"uri">>();
  const initialIp = typia.random<string & tags.Format<"ipv4">>();
  const initialGuest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: initialHref,
      referrer: initialReferrer,
      ip: initialIp,
    },
  });
  typia.assert(initialGuest);
  // 2. Validate initial session has baseline metadata
  const initialSession = initialGuest.sessions[0];
  typia.assertGuard(initialSession!);
  TestValidator.equals("initial href", initialSession.href, initialHref);
  TestValidator.equals(
    "initial referrer",
    initialSession.referrer,
    initialReferrer,
  );
  TestValidator.equals("initial ip", initialSession.ip, initialIp);
  // 3. Prepare new metadata for refresh
  const newHref = typia.random<string & tags.Format<"uri">>();
  const newReferrer = typia.random<string & tags.Format<"uri">>();
  const newIp = typia.random<string & tags.Format<"ipv4">>();
  // 4. Refresh session with updated metadata
  const refreshedGuest = await authorize_guest_refresh(guestConnection, {
    body: {
      href: newHref,
      referrer: newReferrer,
      ip: newIp,
    },
  });
  typia.assert(refreshedGuest);
  // 5. Validate guest identity preserved
  TestValidator.equals(
    "guest id preserved",
    initialGuest.id,
    refreshedGuest.id,
  );
  TestValidator.equals(
    "device fingerprint preserved",
    initialGuest.device_fingerprint,
    refreshedGuest.device_fingerprint,
  );
  // 6. Validate token rotation occurred
  TestValidator.notEquals(
    "access token rotated",
    initialGuest.token.access,
    refreshedGuest.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initialGuest.token.refresh,
    refreshedGuest.token.refresh,
  );
  // 7. Validate session lifetime extended
  TestValidator.predicate(
    "expired_at extended",
    new Date(refreshedGuest.token.expired_at) >
      new Date(initialGuest.token.expired_at),
  );
  // 8. Validate new session has updated metadata (most recent session is first)
  const newSession = refreshedGuest.sessions[0];
  typia.assertGuard(newSession!);
  TestValidator.equals("href updated", newSession.href, newHref);
  TestValidator.equals("referrer updated", newSession.referrer, newReferrer);
  TestValidator.equals("ip updated", newSession.ip, newIp);
  // 9. Validate metadata actually changed from initial values
  TestValidator.notEquals("href changed", initialSession.href, newSession.href);
  TestValidator.notEquals(
    "referrer changed",
    initialSession.referrer,
    newSession.referrer,
  );
  TestValidator.notEquals("ip changed", initialSession.ip, newSession.ip);
}
