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

export async function test_api_community_subscribers_view_by_subscriber(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Create a community as the new member
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = memberConnection.headers;
  const community: IRedditCommunityCommunity =
    await generate_random_reddit_community_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscribeConnection: api.IConnection = { host: connection.host };
  subscribeConnection.headers = memberConnection.headers;
  const subscription: IRedditCommunitySubscription =
    await api.functional.redditCommunity.member.communities.subscribe.create(
      subscribeConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. View subscriber list as the subscribed member
  const subscriberConnection: api.IConnection = { host: connection.host };
  subscriberConnection.headers = memberConnection.headers;
  const subscriberList: IPageIRedditCommunitySubscription.ISummary =
    await api.functional.redditCommunity.communities.subscribers.index(
      subscriberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriberList);
  // 5. Validate response structure and content
  TestValidator.equals(
    "pagination correct",
    subscriberList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit correct",
    subscriberList.pagination.limit,
    20,
  );
  TestValidator.equals(
    "subscriber count correct",
    subscriberList.pagination.records,
    1,
  );
  TestValidator.equals("one subscriber in list", subscriberList.data.length, 1);
  const subscriber = subscriberList.data[0];
  TestValidator.equals(
    "subscriber community ID matches",
    subscriber.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscriber username matches",
    subscriber.member.username,
    member.username,
  );
  TestValidator.equals(
    "subscriber display name matches",
    subscriber.member.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "subscriber created_at exists",
    subscriber.member.created_at !== null,
    true,
  );
  // 6. Verify no sensitive information exposed - DELETED: email/karma_score not on ISummary
  // 7. Verify community info in subscriber response
  TestValidator.equals(
    "community name matches",
    subscriber.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    subscriber.community.description,
    community.description,
  );
  TestValidator.equals(
    "community subscriber count matches",
    subscriber.community.subscriber_count,
    1,
  );
  TestValidator.equals(
    "community created_at exists",
    subscriber.community.created_at !== null,
    true,
  );
  TestValidator.equals(
    "community updated_at exists",
    subscriber.community.updated_at !== null,
    true,
  );
  // 8. Verify community owner info - check direct top-level ownership properties
  // The ISummary interface indicates that owner information is embedded directly in the community object
  const communityMember =
    subscriber.community as unknown as IRedditCommunityMember.ISummary;
  TestValidator.equals(
    "community owner username matches",
    communityMember.username,
    member.username,
  );
  TestValidator.equals(
    "community owner display_name matches",
    communityMember.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "community owner created_at exists",
    communityMember.created_at !== null,
    true,
  );
  TestValidator.equals(
    "community owner id matches",
    communityMember.id,
    member.id,
  );
  // DELETED: owner email/karma_score not on ISummary
}
