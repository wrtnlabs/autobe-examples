import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_reddit_community_guests_session_deletion_by_guest_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest user
  const guestCreateBody = {
    ip: RandomGenerator.pick(["127.0.0.1", "192.168.1.1", "10.0.0.1"] as const),
    href: `https://example.com/page/${RandomGenerator.alphaNumeric(4)}`,
    referrer: `https://referrer.com/ref/${RandomGenerator.alphaNumeric(5)}`,
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    device: "AutomatedTestDevice",
    is_banned: false,
    ban_reason: null,
  } satisfies IRedditCommunityGuest.ICreate;

  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunityGuests.create(
      connection,
      { body: guestCreateBody },
    );
  typia.assert(guest);

  // Step 2: Delete a session of the created guest user
  // Generate a dummy session id (UUID format)
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.redditCommunity.redditCommunityGuests.sessions.erase(
    connection,
    {
      redditCommunityGuestId: guest.id,
      id: sessionId,
    },
  );
}
