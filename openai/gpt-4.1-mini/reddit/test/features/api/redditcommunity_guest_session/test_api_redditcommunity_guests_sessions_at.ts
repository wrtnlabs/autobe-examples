import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function test_api_redditcommunity_guests_sessions_at(
  connection: api.IConnection,
) {
  // 1. Authenticate as a guest user to obtain the guest authorization context
  const authGuest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {},
    });
  typia.assert(authGuest);

  // 2. Create a guest user entry
  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.guests.create(connection, {
      body: {},
    });
  typia.assert(guest);
  TestValidator.predicate(
    "guest ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      guest.id,
    ),
  );

  // 3. Create a new guest session with realistic metadata
  const nowISOString = new Date().toISOString();
  const ipAddress = "192.168.1.100";
  const requestURL = "https://example.com/redditCommunity";
  const referrerURL = "https://google.com";

  const sessionCreateBody = {
    ip: ipAddress,
    href: requestURL,
    referrer: referrerURL,
    created_at: nowISOString,
    expired_at: null,
  } satisfies IRedditCommunityGuestSession.ICreate;

  const session: IRedditCommunityGuestSession =
    await api.functional.redditCommunity.guests.sessions.create(connection, {
      guestId: guest.id,
      body: sessionCreateBody,
    });
  typia.assert(session);
  TestValidator.equals(
    "session guest id matches created guest id",
    session.reddit_community_guest_id,
    guest.id,
  );
  TestValidator.equals("session ip matches creation ip", session.ip, ipAddress);
  TestValidator.equals(
    "session href matches creation href",
    session.href,
    requestURL,
  );
  TestValidator.equals(
    "session referrer matches provided referrer",
    session.referrer,
    referrerURL,
  );
  TestValidator.equals(
    "session created_at matches creation time",
    session.created_at,
    nowISOString,
  );
  TestValidator.equals("session expired_at is null", session.expired_at, null);

  // 4. Retrieve the guest session by guest ID and session ID
  const retrievedSession: IRedditCommunityGuestSession =
    await api.functional.redditCommunity.guests.sessions.at(connection, {
      guestId: guest.id,
      sessionId: session.id,
    });
  typia.assert(retrievedSession);

  // 5. Validate the retrieved session data matches what was created
  TestValidator.equals(
    "retrieved session id matches created session id",
    retrievedSession.id,
    session.id,
  );
  TestValidator.equals(
    "retrieved session guest id matches",
    retrievedSession.reddit_community_guest_id,
    guest.id,
  );
  TestValidator.equals(
    "retrieved session ip matches",
    retrievedSession.ip,
    ipAddress,
  );
  TestValidator.equals(
    "retrieved session href matches",
    retrievedSession.href,
    requestURL,
  );
  TestValidator.equals(
    "retrieved session referrer matches",
    retrievedSession.referrer,
    referrerURL,
  );
  TestValidator.equals(
    "retrieved session created_at matches",
    retrievedSession.created_at,
    nowISOString,
  );
  TestValidator.equals(
    "retrieved session expired_at is null",
    retrievedSession.expired_at,
    null,
  );
}
