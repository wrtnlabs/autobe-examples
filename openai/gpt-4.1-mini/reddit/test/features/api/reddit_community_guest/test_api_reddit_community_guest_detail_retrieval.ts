import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_reddit_community_guest_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Create a new guest user record with an IPv4 address, and optional user agent, referrer and device type, and session start time.
  const createBody = {
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    user_agent: RandomGenerator.paragraph({ sentences: 2 }),
    referrer_url: typia.random<string & tags.Format<"uri">>(),
    device_type: RandomGenerator.name(1),
    session_start_time: new Date().toISOString(),
  } satisfies IRedditCommunityGuest.ICreate;

  const createdGuest: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunity.guests.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdGuest);

  // 2. Retrieve the created guest user record by ID
  const fetchedGuest: IRedditCommunityGuest =
    await api.functional.redditCommunity.redditCommunity.guests.at(connection, {
      id: createdGuest.id,
    });
  typia.assert(fetchedGuest);

  // 3. Verify that the fetched guest matches the created guest record
  TestValidator.equals(
    "guest id should match",
    fetchedGuest.id,
    createdGuest.id,
  );
  TestValidator.equals(
    "guest session id should match",
    fetchedGuest.session_id,
    createdGuest.session_id,
  );
  TestValidator.equals(
    "guest ip address should match",
    fetchedGuest.ip_address,
    createdGuest.ip_address,
  );
  TestValidator.equals(
    "guest user agent should match",
    fetchedGuest.user_agent,
    createdGuest.user_agent,
  );
  TestValidator.equals(
    "guest device type should match",
    fetchedGuest.device_type,
    createdGuest.device_type,
  );
  TestValidator.equals(
    "guest created_at timestamp should match",
    fetchedGuest.created_at,
    createdGuest.created_at,
  );
}
