import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that returning visitor with same device fingerprint receives refreshed tokens.
 *
 * Validates the idempotent behavior of guest registration where the system queries ecommerce_platform_guests for an existing active guest matching the device_fingerprint. When found, the existing guest record is reused and a new session is created with fresh JWT tokens.
 *
 * 1. First guest join with a unique device fingerprint creates new guest record.
 * 2. Second guest join with same device fingerprint retrieves existing guest.
 * 3. Validates guestId remains the same across both joins (idempotent).
 * 4. Validates tokens are refreshed (different access/refresh tokens).
 * 5. Validates device fingerprint and created_at remain consistent.
 */
export async function test_api_guest_registration_existing_visitor_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // Shared device fingerprint for both joins
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // 1. First join - creates new guest record
  const firstConnection: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_guest_join(firstConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
    },
  });
  typia.assert(firstJoin);
  // 2. Second join - same fingerprint should return existing guest with new tokens
  const secondConnection: api.IConnection = { host: connection.host };
  const secondJoin = await authorize_guest_join(secondConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
    },
  });
  typia.assert(secondJoin);
  // 3. Validate idempotent behavior - same guest ID
  TestValidator.equals("same guest id", firstJoin.id, secondJoin.id);
  // 4. Validate tokens are refreshed (different)
  TestValidator.notEquals(
    "access token refreshed",
    firstJoin.token.access,
    secondJoin.token.access,
  );
  TestValidator.notEquals(
    "refresh token refreshed",
    firstJoin.token.refresh,
    secondJoin.token.refresh,
  );
  // 5. Validate device fingerprint matches in both responses
  TestValidator.equals(
    "device fingerprint matches first",
    firstJoin.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.equals(
    "device fingerprint matches second",
    secondJoin.device_fingerprint,
    deviceFingerprint,
  );
  // 6. Validate created_at is same (guest record reused)
  TestValidator.equals(
    "created_at unchanged",
    firstJoin.created_at,
    secondJoin.created_at,
  );
  // 7. Validate guest is active (not soft deleted)
  TestValidator.equals("first guest active", firstJoin.deleted_at, null);
  TestValidator.equals("second guest active", secondJoin.deleted_at, null);
}
