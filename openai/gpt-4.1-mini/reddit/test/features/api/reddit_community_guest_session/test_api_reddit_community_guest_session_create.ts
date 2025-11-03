import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function test_api_reddit_community_guest_session_create(
  connection: api.IConnection,
) {
  // 1. Join as a new guest to obtain authorized guest user data including guestId
  const guest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(guest);

  // 2. Create a new guest session with IP, referrer, href, and creation timestamp
  const nowISOString = new Date().toISOString();
  const sessionCreateBody = {
    ip: "203.0.113.195",
    referrer: "https://reddit.com/r/testing",
    href: "https://reddit.com/r/testing/comments/12345/awesome_post",
    created_at: nowISOString,
    expired_at: null,
  } satisfies IRedditCommunityGuestSession.ICreate;

  const session: IRedditCommunityGuestSession =
    await api.functional.redditCommunity.guests.sessions.create(connection, {
      guestId: guest.id,
      body: sessionCreateBody,
    });
  typia.assert(session);

  // 3. Validate returned guestId matches the joining guest
  TestValidator.equals(
    "session guestId matches joining guest id",
    session.reddit_community_guest_id,
    guest.id,
  );

  // 4. Validate response fields are properly populated
  TestValidator.predicate(
    "session id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  TestValidator.equals(
    "session ip matches request",
    session.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "session href matches request",
    session.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "session referrer matches request",
    session.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.equals(
    "session created_at is correct",
    session.created_at,
    nowISOString,
  );
  TestValidator.equals("session expired_at is null", session.expired_at, null);
}
