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
 * Test guest account creation with complete session metadata.
 *
 * This test validates the guest join endpoint by:
 * 1. Creating a guest account with device fingerprint and session metadata
 * 2. Submitting href (current page URL), referrer URL, and IP address
 * 3. Validating the response includes valid guest credentials
 * 4. Verifying the authorization token structure is correct
 *
 * The guest account enables anonymous platform access for browsing
 * popular feeds, community feeds, and user profiles without registration.
 */
export async function test_api_guest_join_with_session_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection and join with complete session metadata
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();
  const ipAddress = typia.random<string & tags.Format<"ipv4">>();
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: currentUrl,
      referrer: referrerUrl,
      ip: ipAddress,
    } satisfies IRedditCloneGuest.IJoin,
  });
  // Validate response structure with typia
  typia.assert(guestAuth);
  // Validate expiration times are in the future (business logic)
  const now = new Date();
  const expiredAt = new Date(guestAuth.token.expired_at);
  const refreshableUntil = new Date(guestAuth.token.refreshable_until);
  TestValidator.predicate(
    "access token not yet expired",
    () => expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token valid period",
    () => refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh expires after access",
    () => refreshableUntil >= expiredAt,
  );
  // Validate guest connection has authorization header set
  TestValidator.predicate("connection has authorization header", () => {
    return (
      guestConnection.headers !== undefined &&
      guestConnection.headers.Authorization !== undefined
    );
  });
  // Test guest account reuse with same device fingerprint
  const guestConnection2: api.IConnection = { host: connection.host };
  const guestAuth2 = await authorize_guest_join(guestConnection2, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guestAuth2);
  // Same device fingerprint should return same guest account ID (business logic)
  TestValidator.equals(
    "same guest id for same fingerprint",
    guestAuth.id,
    guestAuth2.id,
  );
}
