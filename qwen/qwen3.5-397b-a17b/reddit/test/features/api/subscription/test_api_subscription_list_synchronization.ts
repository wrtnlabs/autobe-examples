import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
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
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_subscription_list_synchronization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community to test subscription changes
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Verify initial subscriber count is 0
  TestValidator.equals(
    "initial subscriber count",
    community.subscriber_count,
    0,
  );
  // 3. Get initial subscription list (should be empty)
  const initialSubscriptions =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(initialSubscriptions);
  TestValidator.equals(
    "initial subscription count",
    initialSubscriptions.data.length,
    0,
  );
  // 4. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Verify subscription appears in list immediately
  const afterSubscribeSubscriptions =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(afterSubscribeSubscriptions);
  TestValidator.equals(
    "subscription count after subscribe",
    afterSubscribeSubscriptions.data.length,
    1,
  );
  TestValidator.equals(
    "subscribed community matches",
    afterSubscribeSubscriptions.data[0].community.id,
    community.id,
  );
  TestValidator.equals(
    "subscribed community name matches",
    afterSubscribeSubscriptions.data[0].community.name,
    community.name,
  );
  // 6. Verify subscriber_count increased
  TestValidator.equals(
    "subscriber count after subscribe",
    afterSubscribeSubscriptions.data[0].community.subscriber_count,
    1,
  );
  // 7. Unsubscribe from the community
  await api.functional.redditCommunity.member.communities.subscription.erase(
    memberConnection,
    {
      communityName: community.name,
    },
  );
  // 8. Verify subscription is removed from list immediately
  const afterUnsubscribeSubscriptions =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(afterUnsubscribeSubscriptions);
  TestValidator.equals(
    "subscription count after unsubscribe",
    afterUnsubscribeSubscriptions.data.length,
    0,
  );
  // 9. Subscribe again to verify it reappears
  const secondSubscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(secondSubscription);
  // 10. Verify subscription reappears in list
  const finalSubscriptions =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(finalSubscriptions);
  TestValidator.equals(
    "final subscription count",
    finalSubscriptions.data.length,
    1,
  );
  TestValidator.equals(
    "final subscribed community matches",
    finalSubscriptions.data[0].community.id,
    community.id,
  );
  TestValidator.equals(
    "final subscriber count",
    finalSubscriptions.data[0].community.subscriber_count,
    1,
  );
}
