import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session creation with device fingerprint authentication.
 *
 * Validates the complete guest session creation flow including device fingerprint submission, guest account generation, and JWT token issuance. Ensures that the system properly recognizes anonymous users by their device characteristics without requiring registration.
 *
 * The test verifies that a unique guest ID is generated in UUID format, JWT tokens (access and refresh) are returned with proper expiration timestamps, and the response includes all required fields for guest identity and session management.
 *
 * 1. Generate unique device fingerprint for guest identification.
 * 2. Create guest session using authorize_guest_join utility function.
 * 3. Validate guest account structure including id, device_fingerprint, and timestamps.
 * 4. Verify JWT token structure with access, refresh, and expiration metadata.
 * 5. Confirm deleted_at is null for active guest account.
 */
export async function test_api_guest_session_creation_with_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare guest session creation with unique device fingerprint
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinInput = {
    deviceFingerprint,
    href,
    referrer,
    ip,
  } satisfies IRedditCommunityGuest.IJoin;
  // 2. Create guest session using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: joinInput,
  });
  typia.assert(guest);
  // 3. Validate business logic - device fingerprint matches input
  TestValidator.equals(
    "device fingerprint matches",
    guest.device_fingerprint,
    deviceFingerprint,
  );
  // 4. Validate business logic - deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    guest.deleted_at,
    null,
  );
  // 5. Verify token expiration logic (refreshable_until should be after expired_at)
  const expiredAt = new Date(guest.token.expired_at).getTime();
  const refreshableUntil = new Date(guest.token.refreshable_until).getTime();
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil >= expiredAt,
  );
}
