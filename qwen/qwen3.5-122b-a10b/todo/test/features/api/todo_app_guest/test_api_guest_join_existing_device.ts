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
 * Test guest join idempotency with duplicate device fingerprint.
 *
 * Validates that submitting the same device fingerprint twice returns the existing guest account rather than creating a duplicate. The second request should return the same guest ID as the first request, with a new session created but the original guest record preserved. This validates idempotency and prevents duplicate guest accounts for the same device.
 *
 * 1. Generate a unique device fingerprint for testing
 * 2. First guest join with the device fingerprint
 * 3. Second guest join with the SAME device fingerprint
 * 4. Validate both requests return the same guest ID
 * 5. Validate both responses have valid structure and tokens
 * 6. Validate that session tokens differ (new session created each time)
 */
export async function test_api_guest_join_existing_device(
  connection: api.IConnection,
): Promise<void> {
  // Generate a fixed device fingerprint for idempotency test
  const deviceFingerprint: string = RandomGenerator.alphaNumeric(16);
  // First guest join
  const firstConnection: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_guest_join(firstConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(firstJoin);
  // Second guest join with SAME device fingerprint
  const secondConnection: api.IConnection = { host: connection.host };
  const secondJoin = await authorize_guest_join(secondConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(secondJoin);
  // Validate idempotency - same guest ID returned
  TestValidator.equals("guest ID matches", firstJoin.id, secondJoin.id);
  TestValidator.equals(
    "device fingerprint matches",
    firstJoin.device_fingerprint,
    secondJoin.device_fingerprint,
  );
  // Validate tokens are different (new session created)
  TestValidator.notEquals(
    "session tokens differ",
    firstJoin.token.access,
    secondJoin.token.access,
  );
}
