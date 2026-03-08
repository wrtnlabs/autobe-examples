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
 * Test duplicate device fingerprint handling in guest session creation.
 *
 * Validates that when a guest session is created with a device fingerprint
 * that already exists in the system:
 * 1. The same guest ID is returned (not a new guest account)
 * 2. New JWT tokens are generated for the session
 * 3. A new session record is created while the guest account remains unchanged
 * 4. The system handles duplicate fingerprints gracefully
 *
 * This test ensures session continuity and idempotency for anonymous users.
 */
export async function test_api_guest_session_duplicate_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Create first guest session with specific device fingerprint
  const firstFingerprint: string = RandomGenerator.alphabets(32);
  const firstHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const firstReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const firstJoinResult: IDiscussionBoardGuest.IAuthorized =
    await authorize_guest_join(connection, {
      body: {
        device_fingerprint: firstFingerprint,
        href: firstHref,
        referrer: firstReferrer,
      } satisfies IDiscussionBoardGuest.IJoin,
    });
  typia.assert(firstJoinResult);
  // Create second guest session with SAME device fingerprint but different metadata
  const secondHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const secondReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const secondJoinResult: IDiscussionBoardGuest.IAuthorized =
    await authorize_guest_join(connection, {
      body: {
        device_fingerprint: firstFingerprint, // Same fingerprint
        href: secondHref, // Different href
        referrer: secondReferrer, // Different referrer
      } satisfies IDiscussionBoardGuest.IJoin,
    });
  typia.assert(secondJoinResult);
  // Verify the same guest ID is returned
  TestValidator.equals(
    "guest ID remains the same for duplicate fingerprint",
    firstJoinResult.id,
    secondJoinResult.id,
  );
  // Verify device fingerprint is preserved
  TestValidator.equals(
    "device fingerprint matches input",
    secondJoinResult.device_fingerprint,
    firstFingerprint,
  );
  // Verify new JWT tokens are generated (tokens should be different)
  TestValidator.notEquals(
    "new access token generated",
    firstJoinResult.token.access,
    secondJoinResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token generated",
    firstJoinResult.token.refresh,
    secondJoinResult.token.refresh,
  );
  // Verify token expiration timestamps are valid
  TestValidator.predicate(
    "first token has valid expiration",
    new Date(firstJoinResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "second token has valid expiration",
    new Date(secondJoinResult.token.expired_at) > new Date(),
  );
  // Verify guest account timestamps
  TestValidator.predicate(
    "guest has created_at timestamp",
    new Date(firstJoinResult.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "guest has updated_at timestamp",
    new Date(firstJoinResult.updated_at) <= new Date(),
  );
  // Verify guest is not deleted
  TestValidator.equals(
    "guest account is active",
    firstJoinResult.deleted_at,
    null,
  );
}
