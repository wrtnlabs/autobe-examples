import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test idempotent guest registration with duplicate device fingerprint.
 *
 * This test verifies that when a guest attempts to register with a device
 * fingerprint that already exists in the system, the operation returns the
 * existing guest record rather than creating a duplicate. The response should
 * include the same guest ID as the original registration, ensuring consistent
 * guest identification across multiple registration attempts from the same device.
 */
export async function test_api_guest_join_idempotent_existing_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. First guest registration with specific device fingerprint
  const guestConnection1: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const firstRegistration = await authorize_guest_join(guestConnection1, {
    body: {
      device_fingerprint: deviceFingerprint,
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(firstRegistration);
  // Store the guest ID from first registration
  const originalGuestId = firstRegistration.id;
  // 2. Second guest registration with the SAME device fingerprint
  const guestConnection2: api.IConnection = { host: connection.host };
  const secondRegistration = await authorize_guest_join(guestConnection2, {
    body: {
      device_fingerprint: deviceFingerprint,
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(secondRegistration);
  // 3. Verify idempotent behavior - both registrations return the same guest ID
  TestValidator.equals(
    "guest ID matches original",
    secondRegistration.id,
    originalGuestId,
  );
  // 4. Verify that new tokens were issued for the existing guest
  TestValidator.notEquals(
    "access token is new",
    secondRegistration.token.access,
    firstRegistration.token.access,
  );
  TestValidator.notEquals(
    "refresh token is new",
    secondRegistration.token.refresh,
    firstRegistration.token.refresh,
  );
}
