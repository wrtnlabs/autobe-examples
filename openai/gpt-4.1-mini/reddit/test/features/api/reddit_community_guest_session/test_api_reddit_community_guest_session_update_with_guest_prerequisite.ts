import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function test_api_reddit_community_guest_session_update_with_guest_prerequisite(
  connection: api.IConnection,
) {
  // 1. Create a new redditCommunity guest user with required fields
  const guestBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://${RandomGenerator.alphabets(10)}.com/home`,
    referrer: `https://${RandomGenerator.alphabets(8)}.com/landing`,
    user_agent: RandomGenerator.name(3),
    device: `Device-${RandomGenerator.alphabets(5)}`,
    is_banned: false,
    ban_reason: null,
  } satisfies IRedditCommunityGuest.ICreate;

  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunityGuests.create(
      connection,
      { body: guestBody },
    );
  typia.assert(guest);
  TestValidator.predicate(
    "created guest has uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guest.id,
    ),
  );

  // 2. Prepare session update payload with required href and referrer, and optional ip
  const sessionUpdate = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://${RandomGenerator.alphabets(12)}.com/page`,
    referrer: `https://${RandomGenerator.alphabets(7)}.com/ref`,
    expires_at: null,
    created_at: null,
  } satisfies IRedditCommunityGuestSession.IUpdate;

  // 3. Use the guest id and a generated fake session id to update session
  // Here, the real session id should be realistic; we simulate as a new uuid
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const updatedSession: IRedditCommunityGuestSession =
    await api.functional.redditCommunity.redditCommunityGuests.sessions.update(
      connection,
      {
        redditCommunityGuestId: guest.id,
        id: sessionId,
        body: sessionUpdate,
      },
    );
  typia.assert(updatedSession);

  // 4. Validate that the updated session matches the input where applicable
  TestValidator.equals(
    "session id is as requested",
    updatedSession.id,
    sessionId,
  );
  TestValidator.equals(
    "guest id matches",
    updatedSession.redditCommunityGuestId,
    guest.id,
  );
  if (sessionUpdate.ip === null) {
    TestValidator.equals(
      "ip is null as provided",
      updatedSession.ip ?? null,
      null,
    );
  } else {
    TestValidator.equals(
      "ip matches updated",
      updatedSession.ip ?? null,
      sessionUpdate.ip ?? null,
    );
  }
  TestValidator.predicate(
    "href is non-empty string",
    typeof updatedSession.url === "string" && updatedSession.url.length > 0,
  );
  TestValidator.predicate(
    "referrer is non-empty string",
    typeof updatedSession.referrer === "string" &&
      updatedSession.referrer.length > 0,
  );
  // expires_at and created_at may be null or ISO string
  if (sessionUpdate.expires_at === null) {
    TestValidator.equals(
      "expires_at is null as provided",
      updatedSession.expiresAt ?? null,
      null,
    );
  }
  if (sessionUpdate.created_at === null) {
    TestValidator.equals(
      "created_at is null as provided",
      updatedSession.createdAt ?? null,
      null,
    );
  }
}
