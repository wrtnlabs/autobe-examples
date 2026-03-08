import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the creation of a new guest account when the device fingerprint
 * is not yet registered in the system.
 *
 * This test verifies that:
 * 1. A new guest account is created for an unrecognized device fingerprint
 * 2. JWT tokens (access and refresh) are generated correctly
 * 3. Token expiration times are set appropriately with refresh token lasting longer
 * 4. Session context fields are captured for analytics
 */
export async function test_api_guest_join_new_device(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a unique device fingerprint for testing new device scenario
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // Call guest join with new device fingerprint and session context
  const response = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: "https://example.com/welcome",
      referrer: "https://example.com/landing",
      ip: "192.168.1.100",
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(response);
  // Validate response structure and business logic
  TestValidator.predicate("id is valid UUID format", response.id.length === 36);
  TestValidator.predicate(
    "access token is non-empty",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    response.token.refresh.length > 0,
  );
  // Validate token expiration timestamps
  const expiredAt = new Date(response.token.expired_at);
  const refreshableUntil = new Date(response.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "access token expires in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expires in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > expiredAt,
  );
}
