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
 * Test guest registration with complete connection metadata including referrer tracking.
 *
 * This test validates the guest join endpoint with all connection metadata fields:
 * - Device fingerprint for unique guest identification
 * - IP address for security monitoring
 * - User agent for device identification
 * - Href (current URL) and referrer (source URL) for access pattern tracking
 * - IP address in request for client identification
 *
 * The test verifies that authentication tokens are properly generated and that
 * the authorization header is correctly set for subsequent requests.
 */
export async function test_api_guest_join_with_referrer_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Prepare guest join request with all metadata fields
  const joinBody = {
    device_fingerprint: RandomGenerator.alphaNumeric(32),
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformGuest.IJoin;
  // Execute guest join using utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  // Validate response structure (comprehensive type validation)
  typia.assert(authorized);
  // Verify guest was created with unique ID
  TestValidator.predicate(
    "guest ID was generated",
    authorized.id !== undefined && authorized.id.length > 0,
  );
  // Verify tokens were generated
  TestValidator.predicate(
    "access token was generated",
    authorized.token.access !== undefined && authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token was generated",
    authorized.token.refresh !== undefined &&
      authorized.token.refresh.length > 0,
  );
  // Verify session has valid expiration times
  TestValidator.predicate(
    "access token has expiration time",
    authorized.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token has expiration time",
    authorized.token.refreshable_until !== undefined,
  );
  // Verify session refresh window is valid (refreshable_until > expired_at)
  TestValidator.predicate(
    "refresh window is valid",
    new Date(authorized.token.refreshable_until) >
      new Date(authorized.token.expired_at),
  );
  // Verify authorization header was set in connection for subsequent requests
  TestValidator.predicate(
    "authorization header was set",
    guestConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header contains access token",
    guestConnection.headers?.Authorization,
    `Bearer ${authorized.token.access}`,
  );
}
