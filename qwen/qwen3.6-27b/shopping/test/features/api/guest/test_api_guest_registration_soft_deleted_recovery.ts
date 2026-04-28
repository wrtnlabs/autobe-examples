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
 * Test guest registration workflow and soft-deleted recovery behavior.
 *
 * Validates the guest join endpoint's handling of device fingerprints. When a guest joins with a device fingerprint that matches an existing active guest account, the system returns the same guest identity with fresh session tokens. This confirms the idempotent nature of the join operation for active guests.
 *
 * The service logic specifies that soft-deleted guests (non-null deleted_at) would trigger creation of a new guest record with fresh timestamps and null deleted_at. However, without admin-level soft-delete functionality, this scenario documents the expected behavior while testing the observable idempotent behavior for active guests.
 *
 * 1. First guest join with a specific device fingerprint creates a new guest account.
 * 2. Response is validated for IAuthorized structure with active account (deleted_at is null).
 * 3. Second guest join with the SAME device fingerprint retrieves existing active guest.
 * 4. Validates that both joins return the same guest ID, confirming idempotent behavior.
 */
export async function test_api_guest_registration_soft_deleted_recovery(
  connection: api.IConnection,
): Promise<void> {
  // Device fingerprint to use across multiple join attempts
  const deviceFingerprint = RandomGenerator.alphabets(32);
  // 1. First guest join - creates new guest account
  const firstGuestConnection: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_guest_join(firstGuestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
    },
  });
  typia.assert(firstJoin);
  // Validate first join response structure and active account state
  TestValidator.equals(
    "first join device fingerprint matches",
    firstJoin.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.equals(
    "first join account is active (deleted_at is null)",
    firstJoin.deleted_at,
    null,
  );
  TestValidator.predicate(
    "first join has valid guest ID",
    () => typeof firstJoin.id === "string" && firstJoin.id.length === 36,
  );
  TestValidator.predicate(
    "first join has valid token with access",
    () =>
      typeof firstJoin.token.access === "string" &&
      firstJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "first join has valid token with refresh",
    () =>
      typeof firstJoin.token.refresh === "string" &&
      firstJoin.token.refresh.length > 0,
  );
  const firstGuestId = firstJoin.id;
  const firstCreatedAt = firstJoin.created_at;
  const firstUpdatedAt = firstJoin.updated_at;
  // 2. Second guest join with SAME device fingerprint
  // Since the guest is still ACTIVE (not soft-deleted), system should return existing guest
  const secondGuestConnection: api.IConnection = { host: connection.host };
  const secondJoin = await authorize_guest_join(secondGuestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
    },
  });
  typia.assert(secondJoin);
  // 3. Validate idempotent behavior - same guest returned
  TestValidator.equals(
    "second join returns same guest ID as first join",
    secondJoin.id,
    firstGuestId,
  );
  TestValidator.equals(
    "second join device fingerprint matches",
    secondJoin.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.equals(
    "second join account remains active (deleted_at is null)",
    secondJoin.deleted_at,
    null,
  );
  TestValidator.equals(
    "second join has same created_at as original guest",
    secondJoin.created_at,
    firstCreatedAt,
  );
  // 4. Validate that second join gets a FRESH session with new tokens
  TestValidator.notEquals(
    "second join gets new access token",
    secondJoin.token.access,
    firstJoin.token.access,
  );
  TestValidator.notEquals(
    "second join gets new refresh token",
    secondJoin.token.refresh,
    firstJoin.token.refresh,
  );
  TestValidator.predicate(
    "second join token has future expiration",
    () => new Date(secondJoin.token.expired_at) > new Date(),
  );
}
