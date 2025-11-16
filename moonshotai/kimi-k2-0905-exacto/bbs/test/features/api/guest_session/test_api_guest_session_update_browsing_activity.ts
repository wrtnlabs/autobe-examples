import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";
import type { IEconomicDiscussionGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuestSession";

export async function test_api_guest_session_update_browsing_activity(
  connection: api.IConnection,
) {
  // First create a guest user account to establish authentication
  const guestUser = await api.functional.auth.guest.join(connection, {
    body: {
      username: RandomGenerator.name(),
      user_agent: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicDiscussionGuest.ICreate,
  });
  typia.assert(guestUser);

  // Create initial guest session with baseline data
  const session =
    await api.functional.economicDiscussion.guests.sessions.createSession(
      connection,
      {
        guestId: guestUser.id,
        body: {
          guest_id: guestUser.id,
          ip: typia.random<string & tags.Format<"ipv4">>(),
          href: "https://economics-discussion.example.com/articles/page1",
          referrer: "https://google.com",
        } satisfies IEconomicDiscussionGuestSession.ICreate,
      },
    );
  typia.assert(session);

  // Update session with new browsing activity - navigate to different page
  const updatedSession =
    await api.functional.economicDiscussion.guests.sessions.update(connection, {
      guestId: guestUser.id,
      sessionId: session.id,
      body: {
        href: "https://economics-discussion.example.com/articles/inflation-analysis",
        referrer: "https://economics-discussion.example.com/articles/page1",
      } satisfies IEconomicDiscussionGuestSession.IUpdate,
    });
  typia.assert(updatedSession);

  // Verify session was updated correctly
  TestValidator.equals("session ID matches", updatedSession.id, session.id);
  TestValidator.equals(
    "guest ID matches",
    updatedSession.economic_discussion_guest_id,
    guestUser.id,
  );
  TestValidator.equals(
    "new href updated",
    updatedSession.href,
    "https://economics-discussion.example.com/articles/inflation-analysis",
  );
  TestValidator.equals(
    "referrer updated",
    updatedSession.referrer,
    "https://economics-discussion.example.com/articles/page1",
  );
  TestValidator.predicate(
    "created_at preserved",
    updatedSession.created_at === session.created_at,
  );

  // Update session again with different navigation pattern
  const finalSession =
    await api.functional.economicDiscussion.guests.sessions.update(connection, {
      guestId: guestUser.id,
      sessionId: session.id,
      body: {
        href: "https://economics-discussion.example.com/articles/2024-economic-outlook",
        referrer:
          "https://economics-discussion.example.com/articles/inflation-analysis",
        expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Extend session by 30 minutes
      } satisfies IEconomicDiscussionGuestSession.IUpdate,
    });
  typia.assert(finalSession);

  // Verify final session state
  TestValidator.equals(
    "href updated to economic outlook",
    finalSession.href,
    "https://economics-discussion.example.com/articles/2024-economic-outlook",
  );
  TestValidator.equals(
    "referrer updated to inflation analysis",
    finalSession.referrer,
    "https://economics-discussion.example.com/articles/inflation-analysis",
  );
  TestValidator.notEquals(
    "expired_at should be different",
    finalSession.expired_at,
    session.expired_at,
  );
}
