import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_browse_communities_subscriber_count_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create updated connection with token for member operations
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 2. Browse communities initially to record baseline
  const initialBrowsing: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.member.browse_communities.browse(
      memberAuthConnection,
    );
  typia.assert(initialBrowsing);
  // Test requires at least one community to exist
  TestValidator.equals(
    "communities exist for testing",
    initialBrowsing.data.length > 0,
    true,
  );
  // Find test community
  const testCommunity = initialBrowsing.data[0];
  // Record baseline subscriber count
  const baselineSubscriberCount = testCommunity.subscriber_count ?? 0;
  // 3. Subscribe to test community
  const subscription: IRedditCommunitySubscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberAuthConnection,
      {
        body: {
          reddit_community_communities_id: testCommunity.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Browse again and verify subscriber_count increased
  const afterSubscribeBrowsing: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.member.browse_communities.browse(
      memberAuthConnection,
    );
  typia.assert(afterSubscribeBrowsing);
  const afterSubscribeCommunity = afterSubscribeBrowsing.data.find(
    (c) => c.id === testCommunity.id,
  );
  TestValidator.equals(
    "found community after subscribe",
    afterSubscribeCommunity !== undefined,
    true,
  );
  // 5. Verify subscriber count is baseline + 1
  const expectedCount = baselineSubscriberCount + 1;
  TestValidator.equals(
    "subscriber_count is baseline + 1 after subscription",
    afterSubscribeCommunity!.subscriber_count ?? 0,
    expectedCount,
  );
}