import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function test_api_reddit_community_guest_session_creation_with_guest_prerequisite(
  connection: api.IConnection,
) {
  // 1. Create a redditCommunity guest user
  const guestCreatePayload = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
    user_agent: `UserAgent/${RandomGenerator.alphaNumeric(4)}`,
    device: `Device/${RandomGenerator.alphaNumeric(4)}`,
    is_banned: false,
    ban_reason: null,
  } satisfies IRedditCommunityGuest.ICreate;
  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunityGuests.create(
      connection,
      { body: guestCreatePayload },
    );
  typia.assert(guest);

  // 2. Create a redditCommunity guest session linked with the guest
  const sessionCreatePayload = {
    ip: guestCreatePayload.ip,
    href: guestCreatePayload.href satisfies string & tags.Format<"uri">,
    referrer: guestCreatePayload.referrer satisfies string & tags.Format<"uri">,
    created_at: new Date().toISOString(),
    expires_at: null,
  } satisfies IRedditCommunityGuestSession.ICreate;

  const session: IRedditCommunityGuestSession =
    await api.functional.redditCommunity.redditCommunityGuests.sessions.create(
      connection,
      {
        redditCommunityGuestId: guest.id,
        body: sessionCreatePayload,
      },
    );
  typia.assert(session);

  // 3. Validate session fields match the input and response is consistent
  TestValidator.equals(
    "session redditCommunityGuestId matches guest id",
    session.redditCommunityGuestId,
    guest.id,
  );
  TestValidator.equals(
    "session IP matches input",
    session.ip,
    guestCreatePayload.ip,
  );
  TestValidator.equals(
    "session url matches input href",
    session.url,
    guestCreatePayload.href,
  );
  TestValidator.equals(
    "session referrer matches input referrer",
    session.referrer,
    guestCreatePayload.referrer,
  );
  TestValidator.predicate(
    "session id presence",
    typeof session.id === "string" && session.id.length > 0,
  );
  TestValidator.predicate(
    "session createdAt is valid ISO string",
    !isNaN(Date.parse(session.createdAt)),
  );
  TestValidator.equals("session expiresAt is null", session.expiresAt, null);
}
