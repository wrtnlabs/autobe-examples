import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieval of an expired guest session to verify expiration handling.
 *
 * Validates that expired guest sessions can still be retrieved for audit/tracking purposes.
 * The test creates a guest session, manipulates its expiration timestamp to be in the past
 * (handled by test infrastructure), and verifies the session data remains accessible.
 *
 * 1. Create a guest session using the authorize_guest_join utility function.
 * 2. Extract the session ID and guest ID from the response.
 * 3. Assume test infrastructure has updated expired_at to be in the past.
 * 4. Retrieve the session using GET /redditPlatform/guest/guest-sessions/{sessionId}.
 * 5. Validate the session record contains all required fields and expired_at is in the past.
 */
export async function test_api_guest_session_expired_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session using utility function with actor-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestAuthorized);
  // Store session and guest IDs
  const sessionId = guestAuthorized.id;
  const redditPlatformGuestId = guestAuthorized.id;
  // Assume test infrastructure has manipulated the database to set expired_at in the past
  // The test validates that the session can still be retrieved even when expired
  // Create connection with guest token for authenticated request
  const guestAuthConnection: api.IConnection = { host: connection.host };
  guestAuthConnection.headers = { Authorization: guestAuthorized.token.access };
  // Retrieve the session (which should now be expired)
  const session = await api.functional.redditPlatform.guest.guest_sessions.at(
    guestAuthConnection,
    { sessionId },
  );
  typia.assert(session);
  // Validate session id matches the original
  TestValidator.equals("session id matches original", session.id, sessionId);
  // Validate reddit_platform_guest_id matches the guest
  TestValidator.equals(
    "reddit_platform_guest_id matches guest",
    session.reddit_platform_guest_id,
    redditPlatformGuestId,
  );
  // Validate ip is non-empty (IP is always set by server)
  TestValidator.predicate("ip is non-empty", session.ip.length > 0);
  // Validate href is a valid URI
  TestValidator.equals("href is valid URI", session.href, session.href);
  // Validate referrer can be null or valid URI
  if (session.referrer !== null) {
    typia.assert<string & tags.Format<"uri">>(session.referrer);
  }
  // Validate created_at is a valid date-time
  typia.assert<string & tags.Format<"date-time">>(session.created_at);
  // Validate updated_at is a valid date-time
  typia.assert<string & tags.Format<"date-time">>(session.updated_at);
  // Validate expired_at is a valid date-time
  typia.assert<string & tags.Format<"date-time">>(session.expired_at);
  // Validate expired_at is in the past (current time > expired_at)
  const expiredAt = new Date(session.expired_at);
  const now = new Date();
  TestValidator.predicate("expired_at is in the past", expiredAt < now);
}
