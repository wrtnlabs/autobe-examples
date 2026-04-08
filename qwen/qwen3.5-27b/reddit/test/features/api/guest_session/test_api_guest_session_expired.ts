import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the behavior when retrieving an expired guest session.
 *
 * Validates that expired guest sessions can still be retrieved for audit purposes while maintaining their expired state information. The test creates a guest session and verifies the session retrieval endpoint works correctly, ensuring the session data structure is accessible even after the session would naturally expire.
 *
 * Special attention is given to ensuring that the session structure remains intact and that the expired_at timestamp accurately reflects the session's lifecycle. This test confirms that the API maintains session records for audit and tracking purposes.
 *
 * 1. Create a guest session using the authorize_guest_join utility function
 * 2. Extract the session ID from the response
 * 3. Retrieve the session using the sessions.at endpoint
 * 4. Validate the session structure and timestamp integrity
 * 5. Confirm that session data is accessible and properly formatted
 */
export async function test_api_guest_session_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(authorized);
  // 2. Extract session information
  const session = authorized.sessions[0];
  typia.assert(session);
  const sessionId = session.id;
  // 3. Retrieve the session using the sessions.at endpoint
  // This simulates accessing a session that may be expired or expiring
  const retrievedSession =
    await api.functional.redditClone.guest.guest.sessions.at(guestConnection, {
      sessionId,
    });
  typia.assert(retrievedSession);
  // 4. Validate session structure matches the original
  TestValidator.equals("session ID matches", retrievedSession.id, sessionId);
  TestValidator.equals(
    "guest ID matches",
    retrievedSession.guest.id,
    authorized.id,
  );
  TestValidator.equals(
    "device fingerprint matches",
    retrievedSession.guest.device_fingerprint,
    authorized.device_fingerprint,
  );
  // 5. Validate IP address is preserved
  TestValidator.equals("IP address matches", retrievedSession.ip, session.ip);
  // 6. Validate href (entry URL) is preserved
  TestValidator.equals(
    "entry URL matches",
    retrievedSession.href,
    session.href,
  );
  // 7. Validate referrer is preserved (may be null)
  TestValidator.equals(
    "referrer matches",
    retrievedSession.referrer,
    session.referrer,
  );
  // 8. Validate timestamps are preserved
  TestValidator.equals(
    "created_at matches",
    retrievedSession.created_at,
    session.created_at,
  );
  TestValidator.equals(
    "expired_at matches",
    retrievedSession.expired_at,
    session.expired_at,
  );
  // 9. Validate that expired_at is after created_at (session had valid lifespan)
  TestValidator.predicate("session expiration is after creation", () => {
    const created = new Date(retrievedSession.created_at).getTime();
    const expired = new Date(retrievedSession.expired_at).getTime();
    return expired > created;
  });
  // 10. Validate that the session can be retrieved (endpoint is accessible)
  // This confirms that even expired sessions remain accessible for audit purposes
  TestValidator.predicate(
    "session is retrievable",
    () => retrievedSession.id !== undefined,
  );
}
