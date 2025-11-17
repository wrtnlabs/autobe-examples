import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_reddit_community_guest_creation(
  connection: api.IConnection,
) {
  // Prepare valid guest creation data with required and optional fields
  const guestCreateBody = {
    href: `https://example.com/landing/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://referrer.com/page/${RandomGenerator.alphaNumeric(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    user_agent: RandomGenerator.name(3),
    device: RandomGenerator.pick(["mobile", "desktop", "tablet"] as const),
    is_banned: false,
    ban_reason: null,
  } satisfies IRedditCommunityGuest.ICreate;

  // Call the create API
  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunityGuests.create(
      connection,
      {
        body: guestCreateBody,
      },
    );

  // Validate response structure and types
  typia.assert(guest);
}
