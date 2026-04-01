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
 * Test guest account creation for a new device fingerprint.
 *
 * This test verifies:
 * 1. Guest registration with unique device fingerprint creates new account
 * 2. Response includes valid guest ID in UUID format
 * 3. JWT tokens (access and refresh) are properly generated
 * 4. Expiration timestamps are valid and in the future
 * 5. Refresh token expiration is after access token expiration
 * 6. Guest connection is properly configured with authorization header
 */
export async function test_api_guest_join_new_device_registration(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique device fingerprint for new guest
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create guest connection and register new guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint,
      href,
      referrer,
      ip,
    } satisfies IRedditCommunityGuest.IJoin,
  });
  // Validate complete response structure with typia
  typia.assert(guestAuth);
  // Verify access token expiration is in the future (business logic)
  TestValidator.predicate("access token expiration is in the future", () => {
    const expiredAt = new Date(guestAuth.token.expired_at);
    const now = new Date();
    return expiredAt > now;
  });
  // Verify refresh token expiration is in the future (business logic)
  TestValidator.predicate("refresh token expiration is in the future", () => {
    const refreshableUntil = new Date(guestAuth.token.refreshable_until);
    const now = new Date();
    return refreshableUntil > now;
  });
  // Verify refresh token lasts longer than access token (business logic)
  TestValidator.predicate(
    "refresh token lasts longer than access token",
    () => {
      const expiredAt = new Date(guestAuth.token.expired_at);
      const refreshableUntil = new Date(guestAuth.token.refreshable_until);
      return refreshableUntil > expiredAt;
    },
  );
  // Verify guest connection has authorization header set for subsequent requests
  TestValidator.predicate("guest connection has authorization header", () => {
    return guestConnection.headers?.Authorization !== undefined;
  });
  // Verify authorization header format is correct
  TestValidator.equals(
    "authorization header format",
    guestConnection.headers?.Authorization,
    `Bearer ${guestAuth.token.access}`,
  );
}
