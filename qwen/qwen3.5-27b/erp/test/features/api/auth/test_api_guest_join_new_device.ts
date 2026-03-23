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
 * Test guest join flow for new device accessing the platform.
 *
 * This test verifies the complete guest registration and authentication flow:
 * 1. Creates a new guest record with unique device fingerprint
 * 2. Validates session creation with connection metadata
 * 3. Verifies JWT token generation and response structure
 * 4. Ensures all required fields are present in the authorization response
 */
export async function test_api_guest_join_new_device(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate unique device fingerprint for this test session
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // Execute guest join using utility function (has priority over SDK)
  const output = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  // Validate response structure
  typia.assert(output);
  // Verify guest ID is a valid UUID
  TestValidator.predicate(
    "guest id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  // Verify token object structure
  TestValidator.predicate(
    "token.access is non-empty string",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    output.token.refresh.length > 0,
  );
  // Verify expiration timestamps are valid date-time format
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    !isNaN(Date.parse(output.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    !isNaN(Date.parse(output.token.refreshable_until)),
  );
  // Verify refreshable_until is after expired_at (session can be refreshed before absolute expiry)
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(output.token.refreshable_until) >
      new Date(output.token.expired_at),
  );
  // Verify guest ID matches device fingerprint uniqueness (same fingerprint should return same guest)
  const secondJoin = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(secondJoin);
  // Same device fingerprint should return same guest ID
  TestValidator.equals(
    "same device fingerprint returns same guest id",
    secondJoin.id,
    output.id,
  );
}
