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

export async function test_api_subscription_retrieve_terminated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create an initial active subscription
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(subscription);
  // 3. Update subscription status to terminated
  const updateBody = {
    status: "terminated",
  } satisfies IRedditCommunitySubscription.IUpdate;
  const updatedSubscription =
    await api.functional.redditCommunity.member.subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSubscription);
  // 4. Retrieve the subscription
  const retrievedSubscription =
    await api.functional.redditCommunity.member.subscriptions.at(
      memberConnection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);
  // 5. Validate terminated status and audit trail
  TestValidator.equals(
    "subscription status is terminated",
    retrievedSubscription.status,
    "terminated",
  );
  TestValidator.equals(
    "deleted_at is set (not null)",
    retrievedSubscription.deleted_at !== null,
    true,
  );
  TestValidator.equals(
    "member relationship present",
    retrievedSubscription.member,
    {
      id: subscription.member.id,
      username: subscription.member.username,
      created_at: subscription.member.created_at,
      updated_at: subscription.member.updated_at,
    },
  );
  TestValidator.equals(
    "community relationship present",
    retrievedSubscription.community,
    {
      id: subscription.community.id,
      name: subscription.community.name,
      created_at: subscription.community.created_at,
    },
  );
  TestValidator.equals(
    "updated_at differs from created_at",
    retrievedSubscription.updated_at,
    retrievedSubscription.created_at,
    (key) => key === "updated_at",
  );
  TestValidator.equals(
    "subscription ID is valid UUID",
    retrievedSubscription.id,
    subscription.id,
  );
}