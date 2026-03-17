import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_subscription_detail_active_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate the community owner (first member)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create a community with the owner's connection
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register and authenticate the subscriber (second member)
  const subscriberConnection: api.IConnection = { host: connection.host };
  const subscriber = await authorize_member_join(subscriberConnection, {});
  typia.assert(subscriber);
  // Step 4: Subscribe the second member to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      subscriberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 5: Retrieve the subscription detail using the subscription ID
  const retrieved = await api.functional.community.member.subscriptions.at(
    subscriberConnection,
    {
      subscriptionId: subscription.id,
    },
  );
  typia.assert(retrieved);
  // Validations
  // Confirm the returned subscription ID matches
  TestValidator.equals(
    "subscription id matches",
    retrieved.id,
    subscription.id,
  );
  // Confirm the member field reflects the subscribing member
  TestValidator.equals(
    "member id matches subscriber",
    retrieved.member.id,
    subscriber.id,
  );
  // Confirm the community field reflects the subscribed community
  TestValidator.equals(
    "community id matches",
    retrieved.community.id,
    community.id,
  );
  // Confirm the subscription is active (deleted_at is null)
  TestValidator.equals(
    "subscription is active (deleted_at is null)",
    retrieved.deleted_at,
    null,
  );
}
