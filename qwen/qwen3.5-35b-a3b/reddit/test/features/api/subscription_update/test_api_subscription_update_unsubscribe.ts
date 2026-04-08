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

export async function test_api_subscription_update_unsubscribe(
  connection: api.IConnection,
) {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create initial subscription (status='active') using memberConnection (already authenticated)
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "initial subscription status is active",
    subscription.status,
    "active",
  );
  // 3. Update subscription status to 'terminated'
  const updateSubscription: api.IConnection = { host: connection.host };
  const updatedSubscription =
    await api.functional.redditCommunity.member.subscriptions.update(
      updateSubscription,
      {
        subscriptionId: subscription.id,
        body: {
          status: "terminated",
        } satisfies IRedditCommunitySubscription.IUpdate,
      },
    );
  typia.assert(updatedSubscription);
  // 4. Verify status is 'terminated'
  TestValidator.equals(
    "subscription status is terminated",
    updatedSubscription.status,
    "terminated",
  );
  // 5. Verify updated_at is different from created_at (timestamp updated)
  TestValidator.notEquals(
    "updated_at changed",
    updatedSubscription.updated_at,
    updatedSubscription.created_at,
  );
  TestValidator.notEquals(
    "updated_at different from original",
    updatedSubscription.updated_at,
    subscription.updated_at,
  );
  // 6. Verify idempotency - update again with same status
  const reupdateSubscription =
    await api.functional.redditCommunity.member.subscriptions.update(
      updateSubscription,
      {
        subscriptionId: subscription.id,
        body: {
          status: "terminated",
        } satisfies IRedditCommunitySubscription.IUpdate,
      },
    );
  typia.assert(reupdateSubscription);
  TestValidator.equals(
    "idempotent update returns same status",
    reupdateSubscription.status,
    "terminated",
  );
  // 7. Verify member and community references are maintained
  TestValidator.equals(
    "member subscription correctly terminated",
    updatedSubscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "community reference maintained",
    updatedSubscription.community.id,
    subscription.community.id,
  );
}
