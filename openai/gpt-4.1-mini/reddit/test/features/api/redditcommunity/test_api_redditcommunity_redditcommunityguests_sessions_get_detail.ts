import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function test_api_redditcommunity_redditcommunityguests_sessions_get_detail(
  connection: api.IConnection,
) {
  // 1. Create a guest user entity
  const guestCreationBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://${RandomGenerator.alphaNumeric(10)}.com/home`,
    referrer: `https://${RandomGenerator.alphaNumeric(8)}.com`,
    user_agent: `Mozilla/${RandomGenerator.alphaNumeric(3)}`,
    device: RandomGenerator.name(),
    is_banned: false,
    ban_reason: null,
  } satisfies IRedditCommunityGuest.ICreate;
  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunityGuests.create(
      connection,
      { body: guestCreationBody },
    );
  typia.assert(guest);

  // 2. Create a guest session for the created guest
  const sessionCreationBody = {
    ip: guestCreationBody.ip ?? null,
    href: `https://${RandomGenerator.alphaNumeric(12)}.com/page`,
    referrer: `https://${RandomGenerator.alphaNumeric(10)}.com`,
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // expire 1 hour later
    created_at: new Date().toISOString(),
  } satisfies IRedditCommunityGuestSession.ICreate;
  const session: IRedditCommunityGuestSession =
    await api.functional.redditCommunity.redditCommunityGuests.sessions.create(
      connection,
      { redditCommunityGuestId: guest.id, body: sessionCreationBody },
    );
  typia.assert(session);

  // 3. Retrieve the guest session by ID
  const retrievedSession: IRedditCommunityGuestSession =
    await api.functional.redditCommunity.redditCommunityGuests.sessions.at(
      connection,
      { redditCommunityGuestId: guest.id, id: session.id },
    );
  typia.assert(retrievedSession);

  // 4. Validate that the retrieved session matches the created session's properties
  TestValidator.equals("session id", retrievedSession.id, session.id);
  TestValidator.equals(
    "guest id",
    retrievedSession.redditCommunityGuestId,
    guest.id,
  );
  TestValidator.equals(
    "ip address",
    retrievedSession.ip ?? null,
    sessionCreationBody.ip ?? null,
  );
  TestValidator.equals(
    "href",
    retrievedSession.url ?? null,
    sessionCreationBody.href ?? null,
  );
  TestValidator.equals(
    "referrer",
    retrievedSession.referrer ?? null,
    sessionCreationBody.referrer ?? null,
  );
  TestValidator.equals(
    "expiry timestamp",
    retrievedSession.expiresAt ?? null,
    sessionCreationBody.expires_at ?? null,
  );
  TestValidator.predicate(
    "retrieved createdAt is a valid ISO date string",
    typeof retrievedSession.createdAt === "string" &&
      !isNaN(Date.parse(retrievedSession.createdAt)),
  );
  // lastAccessedAt may be null or undefined
}
