import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_reddit_community_guest_retrieval(
  connection: api.IConnection,
) {
  // 1. Create a guest user
  const createBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: RandomGenerator.substring("https://example.com/redditPost"),
    referrer: RandomGenerator.substring("https://google.com/search?q=reddit"),
    user_agent: RandomGenerator.name(3),
    device: RandomGenerator.name(1),
    is_banned: false,
    ban_reason: null,
  } satisfies IRedditCommunityGuest.ICreate;

  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunityGuests.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(guest);

  // 2. Retrieve the created guest by ID
  const retrievedGuest: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunityGuests.at(connection, {
      id: guest.id,
    });
  typia.assert(retrievedGuest);

  // 3. Validate retrieved data matches creation
  TestValidator.equals("Guest ID matches", retrievedGuest.id, guest.id);
  TestValidator.equals(
    "Guest created_at matches",
    retrievedGuest.created_at,
    guest.created_at,
  );
  TestValidator.equals(
    "Guest updated_at matches",
    retrievedGuest.updated_at,
    guest.updated_at,
  );
  TestValidator.equals(
    "Guest deleted_at matches",
    retrievedGuest.deleted_at,
    guest.deleted_at,
  );
}
