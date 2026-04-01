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

/**
 * Test subscription list retrieval with multiple communities.
 * 1. Member joins/authenticates
 * 2. Creates 3 communities
 * 3. Subscribes to all 3 communities
 * 4. Retrieves subscription list
 * 5. Validates all subscriptions are returned in correct order
 */
export async function test_api_subscription_list_multiple_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create 3 communities
  const community1 =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community2);
  const community3 =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community3);
  // 3. Subscribe to all 3 communities
  const subscription1 =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community1.name,
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community2.name,
      },
    );
  typia.assert(subscription2);
  const subscription3 =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community3.name,
      },
    );
  typia.assert(subscription3);
  // 4. Retrieve subscription list
  const subscriptionList =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptionList);
  // 5. Validate results
  TestValidator.predicate(
    "has 3 subscriptions",
    subscriptionList.data.length === 3,
  );
  TestValidator.predicate(
    "total records is 3",
    subscriptionList.pagination.records === 3,
  );
  TestValidator.predicate(
    "total pages is 1",
    subscriptionList.pagination.pages === 1,
  );
  TestValidator.predicate(
    "current page is 1",
    subscriptionList.pagination.current === 1,
  );
  // Validate order (most recent first - subscription3 should be first)
  TestValidator.equals(
    "first subscription is community3",
    subscriptionList.data[0].community.id,
    community3.id,
  );
  TestValidator.equals(
    "second subscription is community2",
    subscriptionList.data[1].community.id,
    community2.id,
  );
  TestValidator.equals(
    "third subscription is community1",
    subscriptionList.data[2].community.id,
    community1.id,
  );
  // Validate subscriber counts from subscription list (each community should have 1 subscriber)
  TestValidator.predicate(
    "community3 has 1 subscriber",
    subscriptionList.data[0].community.subscriber_count === 1,
  );
  TestValidator.predicate(
    "community2 has 1 subscriber",
    subscriptionList.data[1].community.subscriber_count === 1,
  );
  TestValidator.predicate(
    "community1 has 1 subscriber",
    subscriptionList.data[2].community.subscriber_count === 1,
  );
}
