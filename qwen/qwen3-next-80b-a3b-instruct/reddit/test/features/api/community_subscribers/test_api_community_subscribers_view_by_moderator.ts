import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
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
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_subscribers_view_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account (will be community owner/moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Create second member account (will subscribe to community)
  const subscriberConnection: api.IConnection = { host: connection.host };
  const subscriber: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(subscriberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 3. Moderator (member1) creates community
  const community =
    await generate_random_reddit_community_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Subscriber (member2) subscribes to community using their authenticated connection
  await api.functional.redditCommunity.member.communities.subscribe.create(
    subscriberConnection,
    {
      communityId: community.id,
    },
  );
  // 5. Moderator (owner) views community subscribers
  // In this system, the community owner automatically has moderator privileges
  const subscribersResponse =
    await api.functional.redditCommunity.communities.subscribers.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          sort: "newest",
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscribersResponse);
  // 6. Validate response structure
  TestValidator.equals(
    "pagination current page",
    subscribersResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    subscribersResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "has at least one subscriber",
    subscribersResponse.data.length >= 1,
  );
  // 7. Validate subscriber data matches the member2 (subscriber) details
  const subscriberData = subscribersResponse.data[0];
  TestValidator.equals(
    "subscriber community ID matches",
    subscriberData.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscriber username matches",
    subscriberData.member.username,
    subscriber.username,
  );
  TestValidator.equals(
    "subscriber member ID matches",
    subscriberData.member.id,
    subscriber.id,
  );
  TestValidator.predicate(
    "subscriber created_at is valid ISO date",
    new Date(subscriberData.member.created_at).toISOString() ===
      subscriberData.member.created_at,
  );
  TestValidator.equals(
    "subscriber karma score matches",
    subscriberData.member.karma_score,
    0,
  ); // New users start with 0 karma
}
