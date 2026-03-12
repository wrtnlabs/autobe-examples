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
 * Test guest join with existing device fingerprint.
 * Verifies that the system reuses existing guest records when the same device
 * fingerprint is used, while generating new session tokens.
 */
export async function test_api_guest_join_existing_device(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for the first guest join
  const guestConnection1: api.IConnection = { host: connection.host };
  // Generate a fixed device fingerprint for testing
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // First join - creates a new guest
  const firstJoin = await authorize_guest_join(guestConnection1, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(firstJoin);
  // Store the first guest ID and tokens
  const firstGuestId = firstJoin.id;
  const firstAccessToken = firstJoin.token.access;
  const firstRefreshToken = firstJoin.token.refresh;
  // Create a new connection for the second guest join
  const guestConnection2: api.IConnection = { host: connection.host };
  // Second join with the SAME device fingerprint - should reuse existing guest
  const secondJoin = await authorize_guest_join(guestConnection2, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(secondJoin);
  // Verify that the guest ID is the same (existing guest reused)
  TestValidator.equals(
    "guest ID should be identical",
    secondJoin.id,
    firstGuestId,
  );
  // Verify that new tokens are generated for the new session
  TestValidator.notEquals(
    "access token should be different",
    secondJoin.token.access,
    firstAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be different",
    secondJoin.token.refresh,
    firstRefreshToken,
  );
  // Verify that tokens are valid (non-empty strings)
  TestValidator.predicate(
    "second access token is not empty",
    secondJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh token is not empty",
    secondJoin.token.refresh.length > 0,
  );
  // Verify token expiration timestamps are valid
  TestValidator.predicate(
    "second expired_at is valid date-time",
    !isNaN(Date.parse(secondJoin.token.expired_at)),
  );
  TestValidator.predicate(
    "second refreshable_until is valid date-time",
    !isNaN(Date.parse(secondJoin.token.refreshable_until)),
  );
}
