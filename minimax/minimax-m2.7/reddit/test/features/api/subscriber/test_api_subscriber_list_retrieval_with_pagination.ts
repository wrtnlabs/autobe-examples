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

export async function test_api_subscriber_list_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member creates a community
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 2. Second member joins and subscribes to the community
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 3. Third member joins and subscribes to the community
  const member3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member3Connection, {});
  await generate_random_reddit_clone_member_subscriptions_create(
    member3Connection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 4. Retrieve subscriber list with pagination
  const subscriberPage =
    await api.functional.redditClone.member.communities.subscribers.index(
      member1Connection,
      {
        communityId: community.id,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCloneSubscription.ISubscriberRequest,
      },
    );
  typia.assert(subscriberPage);
  // 5. Validate response structure and pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    subscriberPage.pagination !== null,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    subscriberPage.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", subscriberPage.pagination.limit, 10);
  TestValidator.predicate(
    "total records at least 2 (member2 and member3)",
    subscriberPage.pagination.records >= 2,
  );
  TestValidator.predicate(
    "total pages at least 1",
    subscriberPage.pagination.pages >= 1,
  );
  // 6. Validate subscriber data fields
  TestValidator.predicate(
    "has subscriber data",
    subscriberPage.data.length > 0,
  );
  for (const subscriber of subscriberPage.data) {
    typia.assert(subscriber);
    TestValidator.predicate(
      "has valid username",
      subscriber.username.length > 0,
    );
    // displayName can be null
    // avatar can be null or undefined
    TestValidator.predicate(
      "has valid karma score",
      typeof subscriber.karmaScore === "number",
    );
    TestValidator.predicate(
      "has valid createdAt date",
      subscriber.createdAt.length > 0,
    );
  }
  // 7. Validate ordering - most recent first (descending by createdAt)
  if (subscriberPage.data.length > 1) {
    for (let i = 0; i < subscriberPage.data.length - 1; i++) {
      const current = new Date(subscriberPage.data[i].createdAt).getTime();
      const next = new Date(subscriberPage.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `subscriber[${i}] createdAt >= subscriber[${i + 1}] createdAt (ordering)`,
        current >= next,
      );
    }
  }
}
