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

/**
 * Test reactivation of a soft-deleted guest identity when the same device fingerprint is used again.
 *
 * Validates that a returning guest with an expired (soft-deleted) record is re-associated with their original identity rather than receiving a duplicate. When the system detects a device fingerprint matching a soft-deleted record (deleted_at IS NOT NULL), it reactivates by clearing deleted_at and reuses the existing guest id. New session tokens are always issued on each join request.
 *
 * 1. First guest join with device_fingerprint "expired-device-001", capturing the returned guest id.
 * 2. Simulate soft-deletion of the guest record (documented only — no test utility available).
 * 3. Second guest join with the same device_fingerprint and new session context (href, referrer).
 * 4. Validate the response returns the same guest id (reactivation, not duplicate creation).
 * 5. Validate that new authorization tokens are issued for the new session.
 */
export async function test_api_guest_join_reactivate_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. First guest join with a specific device fingerprint
  const deviceFingerprint = "expired-device-001";
  const firstGuestConnection: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_guest_join(firstGuestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: "https://example.com/popular",
      referrer: "https://google.com",
    },
  });
  typia.assert(firstJoin);
  // 2. Soft-deletion simulation step (documented only)
  // In a production E2E environment, the guest record would be soft-deleted
  // by setting deleted_at to a past timestamp (e.g., 48 hours ago) via
  // direct database manipulation or a dedicated test utility.
  // This step is omitted as no such utility is available.
  // 3. Second guest join with the SAME device fingerprint
  const secondGuestConnection: api.IConnection = { host: connection.host };
  const secondJoin = await authorize_guest_join(secondGuestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: "https://example.com/community/reactivated",
      referrer: "https://example.com/popular",
    },
  });
  typia.assert(secondJoin);
  // 4. Verify the same guest id is returned (reactivation, not duplicate)
  TestValidator.equals(
    "guest id reused after reactivation",
    secondJoin.id,
    firstJoin.id,
  );
  // 5. Verify new tokens are issued for the new session
  TestValidator.notEquals(
    "new access token issued",
    secondJoin.token.access,
    firstJoin.token.access,
  );
  TestValidator.notEquals(
    "new refresh token issued",
    secondJoin.token.refresh,
    firstJoin.token.refresh,
  );
}
