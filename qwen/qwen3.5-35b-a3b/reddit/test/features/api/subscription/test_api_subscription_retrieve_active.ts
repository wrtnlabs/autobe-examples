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

export async function test_api_subscription_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Generate a random community UUID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create an active subscription
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: communityId,
        },
      },
    );
  typia.assert(subscription);
  // 4. Retrieve the created subscription
  const retrieved =
    await api.functional.redditCommunity.member.subscriptions.at(
      memberConnection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate all fields
  TestValidator.equals(
    "subscription id matches path",
    retrieved.id,
    subscription.id,
  );
  TestValidator.equals("status is active", retrieved.status, "active");
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  TestValidator.equals("member id matches", retrieved.member.id, memberAuth.id);
  TestValidator.equals(
    "member username matches",
    retrieved.member.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "community id matches input",
    retrieved.community.id,
    communityId,
  );
  TestValidator.equals(
    "community name exists",
    retrieved.community.name.length > 0,
    true,
  );
}
