import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_subscription_count_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Establish guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 2: Use the guest connection for community retrieval
  // Extract a valid UUID from a sample community summary for testing
  const sampleCommunity = typia.random<IRedditCommunityCommunity.ISummary>();
  const communityId = sampleCommunity.id;
  // Step 3: Retrieve community subscription count
  const community = await api.functional.redditCommunity.guest.communities.at(
    guestConnection,
    {
      id: communityId,
    },
  );
  // Step 4: Validate response structure and data
  typia.assert(community);
  // Business logic validation: Ensure subscriber_count is non-negative (as per type definition)
  TestValidator.predicate(
    "subscriber_count is non-negative",
    community.subscriber_count >= 0,
  );
}
