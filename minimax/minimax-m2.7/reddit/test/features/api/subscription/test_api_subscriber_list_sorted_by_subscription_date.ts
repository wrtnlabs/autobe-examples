import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_subscriber_list_sorted_by_subscription_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Create subscriber 1 and subscribe to community
  const subscriber1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(subscriber1Connection, {});
  const subscription1 =
    await generate_random_reddit_clone_member_subscriptions_create(
      subscriber1Connection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  // 3. Create subscriber 2 and subscribe to community
  const subscriber2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(subscriber2Connection, {});
  const subscription2 =
    await generate_random_reddit_clone_member_subscriptions_create(
      subscriber2Connection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  // 4. Create subscriber 3 and subscribe to community
  const subscriber3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(subscriber3Connection, {});
  const subscription3 =
    await generate_random_reddit_clone_member_subscriptions_create(
      subscriber3Connection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription3);
  // 5. Retrieve subscribers with ascending sort by subscription date, limit=2, page=1
  const subscriberPage =
    await api.functional.redditClone.member.communities.subscribers.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
          order: "asc" as const,
          sort: "created_at" as const,
        } satisfies IRedditCloneSubscription.ISubscriberRequest,
      },
    );
  typia.assert(subscriberPage);
  // 6. Validate results
  // Page 1 should contain the first 2 subscribers (oldest first in ascending order)
  // Since subscriptions were created in order (subscriber1 first, then subscriber2, then subscriber3),
  // ascending order should show subscriber1's subscription before subscriber2's
  TestValidator.equals(
    "page 1 has 2 subscribers",
    subscriberPage.data.length,
    2,
  );
  TestValidator.equals(
    "current page is 1",
    subscriberPage.pagination.current,
    1,
  );
  TestValidator.equals("limit is 2", subscriberPage.pagination.limit, 2);
  TestValidator.equals(
    "total records is 3",
    subscriberPage.pagination.records,
    3,
  );
  TestValidator.equals("total pages is 2", subscriberPage.pagination.pages, 2);
  // Validate ordering - first subscriber should have subscription date <= second subscriber
  if (subscriberPage.data.length >= 2) {
    const first = subscriberPage.data[0];
    const second = subscriberPage.data[1];
    TestValidator.predicate(
      "first subscriber subscribed before or at same time as second",
      new Date(first.createdAt).getTime() <=
        new Date(second.createdAt).getTime(),
    );
  }
}
