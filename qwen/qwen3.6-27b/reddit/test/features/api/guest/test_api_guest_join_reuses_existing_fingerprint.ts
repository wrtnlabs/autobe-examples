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
 * Test guest identity consistency when joining with an existing device fingerprint.
 *
 * Validates that the system correctly detects returning guests based on their device fingerprint and reuses the existing identity rather than creating duplicates. This ensures session continuity for unauthenticated users across separate requests.
 *
 * 1. Generate a unique device fingerprint.
 * 2. Perform an initial guest join using this fingerprint to establish a baseline identity.
 * 3. Attempt a second guest join with a fresh connection using the identical fingerprint.
 * 4. Verify that the second join returns the exact same guest ID as the first.
 */
export async function test_api_guest_join_reuses_existing_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Define the specific fingerprint to reuse across joins
  const deviceFingerprint = RandomGenerator.alphabets(32);
  // 1. Initial Join
  const guestConnectionOne: api.IConnection = { host: connection.host };
  const guestOne = await authorize_guest_join(guestConnectionOne, {
    body: {
      device_fingerprint: deviceFingerprint,
    },
  });
  typia.assert(guestOne);
  // 2. Subsequent Join with same fingerprint
  const guestConnectionTwo: api.IConnection = { host: connection.host };
  const guestTwo = await authorize_guest_join(guestConnectionTwo, {
    body: {
      device_fingerprint: deviceFingerprint,
    },
  });
  typia.assert(guestTwo);
  // 3. Validation
  TestValidator.equals(
    "Returning guest with identical fingerprint retains same identity",
    guestOne.id,
    guestTwo.id,
  );
}
