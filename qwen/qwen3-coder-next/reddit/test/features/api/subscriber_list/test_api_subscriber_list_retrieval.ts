import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_subscriber_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create two member accounts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2);
  // 2. Setup: Create a community using member1
  const community =
    await api.functional.redditPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Setup: Subscribe member2 to the community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      member2Connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Test: Retrieve subscriber list for the community
  const subscriberList =
    await api.functional.redditPlatform.member.communities.subscribers.index(
      member1Connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscriberList);
  // 5. Validation: Check subscriber list contents
  TestValidator.equals("one subscriber in list", subscriberList.data.length, 1);
  TestValidator.equals(
    "correct subscriber in list",
    subscriberList.data[0].user.id,
    member2.id,
  );
  TestValidator.equals(
    "subscriber has required info",
    subscriberList.data[0].user.username,
    member2.username,
  );
  TestValidator.predicate(
    "subscriber has display name",
    subscriberList.data[0].user.displayName !== undefined,
  );
  TestValidator.predicate(
    "subscriber has avatar",
    subscriberList.data[0].user.avatarUrl !== undefined,
  );
  // 6. Validation: Check pagination metadata
  TestValidator.equals(
    "pagination current page",
    subscriberList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", subscriberList.pagination.limit, 20);
  TestValidator.equals(
    "pagination records",
    subscriberList.pagination.records,
    1,
  );
  TestValidator.equals("pagination pages", subscriberList.pagination.pages, 1);
}
