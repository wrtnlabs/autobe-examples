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

export async function test_api_member_subscription_delete_terminated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a subscription to a random community
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals("subscription is active", subscription.status, "active");
  // 3. Terminate the subscription
  const terminatedSubscription =
    await api.functional.redditCommunity.member.subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          status: "terminated",
        } satisfies IRedditCommunitySubscription.IUpdate,
      },
    );
  typia.assert(terminatedSubscription);
  TestValidator.equals(
    "status is terminated",
    terminatedSubscription.status,
    "terminated",
  );
  // 4. Attempt to delete the terminated subscription - should fail with 409
  await TestValidator.httpError(
    "should reject deletion of terminated subscription",
    [409],
    async () => {
      await api.functional.redditCommunity.member.subscriptions.erase(
        memberConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
  // 5. Verify subscription still exists and is unchanged by checking it can be updated again
  const finalSubscription =
    await api.functional.redditCommunity.member.subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          status: "terminated",
        } satisfies IRedditCommunitySubscription.IUpdate,
      },
    );
  typia.assert(finalSubscription);
  TestValidator.equals(
    "subscription still exists",
    finalSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "status still terminated",
    finalSubscription.status,
    "terminated",
  );
  TestValidator.equals(
    "subscription unchanged from terminated state",
    finalSubscription.status,
    terminatedSubscription.status,
  );
}
