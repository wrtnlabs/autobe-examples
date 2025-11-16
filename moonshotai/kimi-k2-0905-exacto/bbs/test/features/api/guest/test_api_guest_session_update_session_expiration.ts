import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";
import type { IEconomicDiscussionGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuestSession";

export async function test_api_guest_session_update_session_expiration(
  connection: api.IConnection,
) {
  // Step 1: Create guest user for session management
  const guestUser = await api.functional.auth.guest.join(connection, {
    body: {
      username: RandomGenerator.name(),
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    } satisfies IEconomicDiscussionGuest.ICreate,
  });
  typia.assert(guestUser);

  // Step 2: Create initial guest session with basic browsing data
  const initialSession =
    await api.functional.economicDiscussion.guests.sessions.createSession(
      connection,
      {
        guestId: guestUser.id,
        body: {
          guest_id: guestUser.id,
          ip: "192.168.1.100",
          href: "https://economicdiscussion.example.com/articles",
          referrer: "https://google.com/search?q=economic+discussion",
        } satisfies IEconomicDiscussionGuestSession.ICreate,
      },
    );
  typia.assert(initialSession);
  TestValidator.equals(
    "session guest ID matches",
    initialSession.economic_discussion_guest_id,
    guestUser.id,
  );

  // Step 3: Update session expiration to extend validity
  const futureExpiration = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
  const updatedSession =
    await api.functional.economicDiscussion.guests.sessions.update(connection, {
      guestId: guestUser.id,
      sessionId: initialSession.id,
      body: {
        expired_at: futureExpiration,
      } satisfies IEconomicDiscussionGuestSession.IUpdate,
    });
  typia.assert(updatedSession);

  // Step 4: Verify session expiration was updated
  TestValidator.notEquals(
    "session expiration was updated",
    initialSession.expired_at,
    updatedSession.expired_at,
  );
  TestValidator.equals(
    "new expiration timestamp matches",
    updatedSession.expired_at,
    futureExpiration,
  );

  // Step 5: Update session with additional browsing context and refresh expiration
  const newExpiration = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now
  const refreshedSession =
    await api.functional.economicDiscussion.guests.sessions.update(connection, {
      guestId: guestUser.id,
      sessionId: initialSession.id,
      body: {
        href: "https://economicdiscussion.example.com/articles/123",
        referrer: "https://economicdiscussion.example.com/articles",
        expired_at: newExpiration,
      } satisfies IEconomicDiscussionGuestSession.IUpdate,
    });
  typia.assert(refreshedSession);

  // Step 6: Verify complete session refresh
  TestValidator.equals(
    "updated href URL",
    refreshedSession.href,
    "https://economicdiscussion.example.com/articles/123",
  );
  TestValidator.equals(
    "updated referrer",
    refreshedSession.referrer,
    "https://economicdiscussion.example.com/articles",
  );
  TestValidator.notEquals(
    "expiration extended again",
    updatedSession.expired_at,
    refreshedSession.expired_at,
  );
  TestValidator.equals(
    "final expiration set correctly",
    refreshedSession.expired_at,
    newExpiration,
  );

  // Step 7: Validate session data integrity
  TestValidator.equals(
    "preserve session ID",
    refreshedSession.id,
    initialSession.id,
  );
  TestValidator.equals(
    "preserve guest ID",
    refreshedSession.economic_discussion_guest_id,
    guestUser.id,
  );
  TestValidator.equals("preserve IP", refreshedSession.ip, initialSession.ip);
  TestValidator.equals(
    "preserve created time",
    refreshedSession.created_at,
    initialSession.created_at,
  );

  // Validate that expiration times are in valid format
  TestValidator.predicate(
    "initial expiration is valid date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
      updatedSession.expired_at!,
    ),
  );
  TestValidator.predicate(
    "refreshed expiration is valid date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
      refreshedSession.expired_at!,
    ),
  );
}
