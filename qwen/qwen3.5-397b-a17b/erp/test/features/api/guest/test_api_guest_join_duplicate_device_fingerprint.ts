import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test duplicate device fingerprint handling when a guest with the same device fingerprint already exists.
 *
 * Validates the complete duplicate device fingerprint scenario including initial guest account creation, subsequent join attempt with identical fingerprint, and proper response handling. Ensures that the system correctly identifies duplicate fingerprints and returns existing session tokens instead of creating redundant accounts.
 *
 * Special attention is given to verifying that the guest ID remains consistent across both join operations, confirming that no duplicate guest record is created. The test also validates that both responses contain valid authorization tokens through comprehensive type assertion.
 *
 * 1. Create initial guest account with specific device fingerprint using authorize_guest_join utility.
 * 2. Attempt second guest join with identical device fingerprint.
 * 3. Validate that both responses return the same guest ID, confirming duplicate prevention.
 * 4. Validate token structure through typia.assert() which performs complete type validation.
 */
export async function test_api_guest_join_duplicate_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest account with specific device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const firstJoin = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(firstJoin);
  // 2. Attempt second guest join with identical device fingerprint
  const secondGuestConnection: api.IConnection = { host: connection.host };
  const secondJoin = await authorize_guest_join(secondGuestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(secondJoin);
  // 3. Validate that both responses return the same guest ID (core business logic)
  TestValidator.equals("guest ID matches", secondJoin.id, firstJoin.id);
}
