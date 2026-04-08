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
 * Test guest session creation with optional analytics and security tracking data.
 *
 * Validates the complete guest authentication flow including device fingerprint registration, optional tracking data capture (IP address, current page URL, referrer URL), and token generation. Ensures that the guest session is successfully created with all provided tracking information and that the authorization tokens are valid for subsequent authenticated requests.
 *
 * Special attention is given to verifying that all optional analytics fields are properly accepted and that the token structure contains all required fields for session management including access token, refresh token, and expiration timestamps.
 *
 * 1. Create guest session with device fingerprint and all optional tracking fields (IP, href, referrer).
 * 2. Validate the response contains valid guest identity and authorization tokens.
 * 3. Verify the connection is properly authenticated with the access token for subsequent requests.
 */
export async function test_api_guest_session_with_analytics_tracking_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session with tracking data
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Validate guest identity exists and device fingerprint matches input
  TestValidator.equals(
    "device fingerprint matches input",
    guest.device_fingerprint,
    guest.device_fingerprint,
  );
  // 3. Verify connection is authenticated with access token
  TestValidator.predicate(
    "connection has authorization header",
    () => guestConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    guestConnection.headers?.Authorization,
    guest.token.access,
  );
  // 4. Validate token expiration is in the future
  TestValidator.predicate(
    "access token not yet expired",
    () => new Date(guest.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token valid period",
    () => new Date(guest.token.refreshable_until) > new Date(),
  );
}
