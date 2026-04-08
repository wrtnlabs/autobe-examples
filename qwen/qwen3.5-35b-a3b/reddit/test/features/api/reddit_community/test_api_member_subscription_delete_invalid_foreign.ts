import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_member_subscription_delete_invalid_foreign(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const actor1Connection: api.IConnection = { host: connection.host };
  const actor1 = await authorize_member_join(actor1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(actor1);
  // 2. Create second member account
  const actor2Connection: api.IConnection = { host: connection.host };
  const actor2 = await authorize_member_join(actor2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(actor2);
  // 3. First member subscribes to a community (creates subscription A)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const subscriptionA =
    await api.functional.redditCommunity.member.subscriptions.create(
      actor1Connection,
      {
        body: {
          reddit_community_communities_id: communityId,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionA);
  // 4. Second member subscribes to the same community (creates subscription B)
  const subscriptionB =
    await api.functional.redditCommunity.member.subscriptions.create(
      actor2Connection,
      {
        body: {
          reddit_community_communities_id: communityId,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionB);
  // 5. Scenario 1: First member attempts to delete non-existent subscription
  const nonExistentSubscriptionId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "non-existent subscription should return 404",
    async () => {
      await api.functional.redditCommunity.member.subscriptions.erase(
        actor1Connection,
        {
          subscriptionId: nonExistentSubscriptionId,
        },
      );
    },
  );
  // 6. Scenario 2: First member attempts to delete foreign subscription (subscription B)
  await TestValidator.error(
    "foreign subscription should return 403",
    async () => {
      await api.functional.redditCommunity.member.subscriptions.erase(
        actor1Connection,
        {
          subscriptionId: subscriptionB.id,
        },
      );
    },
  );
}
