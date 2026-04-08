import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest registration with existing device fingerprint.
 *
 * Validates the system's handling of duplicate device fingerprint scenarios during guest registration. First registers a guest account with a specific device fingerprint, then attempts to register again with the same fingerprint. The system should recognize the existing guest and return the same guest ID with new or existing authentication tokens.
 *
 * This ensures that anonymous users returning with the same device are recognized as the same guest account, maintaining data consistency and preventing duplicate guest accounts. The test verifies that the guest ID remains consistent across both registration attempts.
 *
 * 1. Register first guest with a specific device fingerprint and capture the guest ID.
 * 2. Attempt second registration with the identical device fingerprint.
 * 3. Verify the second response returns the same guest ID as the first registration.
 * 4. Validate both responses contain proper authentication tokens with correct structure.
 */
export async function test_api_guest_join_with_existing_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique device fingerprint for this test
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // Create session metadata for the registration
  const sessionData = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies Omit<ITodoAppGuest.IJoin, "device_fingerprint">;
  // 1. First registration - create guest account
  const firstConnection: api.IConnection = { host: connection.host };
  const firstGuest = await authorize_guest_join(firstConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      ...sessionData,
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(firstGuest);
  // 2. Second registration - attempt with same device fingerprint
  const secondConnection: api.IConnection = { host: connection.host };
  const secondGuest = await authorize_guest_join(secondConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(secondGuest);
  // 3. Verify same guest ID is returned (no duplicate account created)
  TestValidator.equals(
    "guest ID should match existing account",
    secondGuest.id,
    firstGuest.id,
  );
}
