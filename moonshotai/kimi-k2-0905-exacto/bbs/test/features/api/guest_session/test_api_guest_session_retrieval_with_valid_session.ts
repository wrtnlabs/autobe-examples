import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";
import type { IEconomicDiscussionGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuestSession";

/**
 * Test the complete workflow of creating a guest session and then retrieving it
 * to verify session data integrity.
 *
 * This test validates the complete guest session lifecycle:
 *
 * 1. Create a new guest user account for authentication context
 * 2. Create a guest browsing session with connection details
 * 3. Retrieve the session to verify data integrity
 * 4. Validate that all session fields are correctly stored and retrieved
 *
 * The test ensures that guest users can establish browsing sessions and access
 * their session information including IP tracking, referrer data, and
 * timestamps for analytics purposes.
 */
export async function test_api_guest_session_retrieval_with_valid_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest user account
  const guestUser = await api.functional.auth.guest.join(connection, {
    body: {
      username: RandomGenerator.name(),
      user_agent: RandomGenerator.name(2),
    } satisfies IEconomicDiscussionGuest.ICreate,
  });
  typia.assert(guestUser);

  // Step 2: Create a guest browsing session with realistic data
  const sessionIp = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.
                     ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
                     ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
                     ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()}`;

  const sessionData = {
    guest_id: guestUser.id,
    ip: sessionIp,
    href: `https://example.com/economic-discussion/${RandomGenerator.name(2)}`,
    referrer: RandomGenerator.pick([
      `https://google.com/search?q=${RandomGenerator.name(1)}`,
      undefined,
    ]),
  } satisfies IEconomicDiscussionGuestSession.ICreate;

  const createdSession =
    await api.functional.economicDiscussion.guests.sessions.createSession(
      connection,
      {
        guestId: guestUser.id,
        body: sessionData,
      },
    );
  typia.assert(createdSession);

  // Step 3: Retrieve the session to verify data integrity
  const retrievedSession =
    await api.functional.economicDiscussion.guests.sessions.at(connection, {
      guestId: guestUser.id,
      sessionId: createdSession.id,
    });
  typia.assert(retrievedSession);

  // Step 4: Validate complete session data integrity
  TestValidator.equals(
    "session ID matches",
    retrievedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "guest ID matches",
    retrievedSession.economic_discussion_guest_id,
    guestUser.id,
  );
  TestValidator.equals(
    "IP address matches",
    retrievedSession.ip,
    sessionData.ip,
  );
  TestValidator.equals("href matches", retrievedSession.href, sessionData.href);
  TestValidator.equals(
    "referrer matches",
    retrievedSession.referrer,
    sessionData.referrer,
  );

  // Verify temporal data is present and valid
  TestValidator.predicate(
    "created_at is present",
    () => retrievedSession.created_at.length > 0,
  );
  TestValidator.predicate("expired_at handling is consistent", () =>
    sessionData.referrer === undefined
      ? retrievedSession.expired_at === undefined
      : true,
  );
}
