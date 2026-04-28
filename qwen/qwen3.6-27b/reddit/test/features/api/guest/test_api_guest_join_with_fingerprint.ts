import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest join with device fingerprint for cross-session identity continuity.
 *
 * Validates that providing a device fingerprint during guest join enables session continuity across requests. When the same fingerprint is provided in subsequent join requests, the system recognizes and returns the same guest identity rather than creating a duplicate record.
 *
 * This tests the unique constraint on device_fingerprint and verifies that guests can be recognized across sessions without creating redundant records. Also validates that returned authorization tokens contain both access and refresh credentials.
 *
 * 1. Generate a deterministic device fingerprint string.
 * 2. First guest joins with fingerprint on a fresh connection.
 * 3. Second guest joins with the same fingerprint on a different fresh connection.
 * 4. Validates both joins return the same guest id, confirming identity continuity.
 * 5. Validates token structure includes access and refresh tokens.
 */
export async function test_api_guest_join_with_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Generate a deterministic device fingerprint simulating browser properties hash
  const deviceFingerprint = typia.random<string>();
  // 1. First guest join with fingerprint
  const guestConnection1: api.IConnection = { host: connection.host };
  const guestAuthorized1 = await authorize_guest_join(guestConnection1, {
    body: {
      device_fingerprint: deviceFingerprint,
    },
  });
  typia.assert(guestAuthorized1);
  const firstGuestId = guestAuthorized1.id;
  // 2. Second guest join with SAME fingerprint on a fresh connection (new session)
  const guestConnection2: api.IConnection = { host: connection.host };
  const guestAuthorized2 = await authorize_guest_join(guestConnection2, {
    body: {
      device_fingerprint: deviceFingerprint,
    },
  });
  typia.assert(guestAuthorized2);
  const secondGuestId = guestAuthorized2.id;
  // 3. Validate identity continuity - same fingerprint yields same guest
  TestValidator.equals(
    "same guest id for same device fingerprint",
    firstGuestId,
    secondGuestId,
  );
  // 4. Validate token structure
  TestValidator.predicate(
    "has non-empty access token",
    guestAuthorized2.token.access !== "",
  );
  TestValidator.predicate(
    "has non-empty refresh token",
    guestAuthorized2.token.refresh !== "",
  );
  TestValidator.predicate(
    "has access token expiration",
    guestAuthorized2.token.expired_at !== "",
  );
  TestValidator.predicate(
    "has refreshable until timestamp",
    guestAuthorized2.token.refreshable_until !== "",
  );
}
