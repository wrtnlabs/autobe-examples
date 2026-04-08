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
 * Test returning guest recognition by device fingerprint.
 *
 * Validates that the system correctly identifies returning guests by their device fingerprint and reuses the existing guest account rather than creating duplicates. This ensures session continuity for anonymous users without requiring registration.
 *
 * The test verifies that when a guest joins with an existing device fingerprint, the same guest ID is returned, the original created_at timestamp is preserved, the updated_at reflects the current session, and new authentication tokens are issued.
 *
 * 1. Generate a unique device fingerprint for the test guest.
 * 2. First join: Create initial guest session with the device fingerprint.
 * 3. Capture the guest ID, created_at, and initial token information.
 * 4. Second join: Attempt to join again with the SAME device fingerprint.
 * 5. Validate that the returned guest ID matches the first join (same account).
 * 6. Validate that created_at timestamp is preserved (original account creation time).
 * 7. Validate that updated_at is greater than or equal to the first join's updated_at (session was updated).
 * 8. Validate that new tokens are provided (access and refresh tokens are different from first join).
 */
export async function test_api_guest_session_returning_visitor_recognition(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique device fingerprint for this test
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(32);
  // First join: Create initial guest session
  const firstJoin: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_join(connection, {
      body: {
        deviceFingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityGuest.IJoin,
    });
  typia.assert(firstJoin);
  // Store first join data for comparison
  const firstGuestId = firstJoin.id;
  const firstCreatedAt = firstJoin.created_at;
  const firstUpdatedAt = firstJoin.updated_at;
  const firstAccessToken = firstJoin.token.access;
  const firstRefreshToken = firstJoin.token.refresh;
  // Small delay to ensure updated_at would be different if updated
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Second join: Same device fingerprint should return existing guest
  const secondJoin: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_join(connection, {
      body: {
        deviceFingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityGuest.IJoin,
    });
  typia.assert(secondJoin);
  // Validate guest ID is the same (same account reused)
  TestValidator.equals(
    "guest ID should match (same account reused)",
    secondJoin.id,
    firstGuestId,
  );
  // Validate device fingerprint is the same
  TestValidator.equals(
    "device fingerprint should match",
    secondJoin.device_fingerprint,
    deviceFingerprint,
  );
  // Validate created_at is preserved (original account creation time)
  TestValidator.equals(
    "created_at should be preserved (original creation time)",
    secondJoin.created_at,
    firstCreatedAt,
  );
  // Validate updated_at is greater than or equal to first join
  TestValidator.predicate(
    "updated_at should reflect current session (>= first join)",
    new Date(secondJoin.updated_at).getTime() >=
      new Date(firstUpdatedAt).getTime(),
  );
  // Validate new tokens are issued (tokens should be different)
  TestValidator.notEquals(
    "access token should be renewed (different from first join)",
    secondJoin.token.access,
    firstAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be renewed (different from first join)",
    secondJoin.token.refresh,
    firstRefreshToken,
  );
}
