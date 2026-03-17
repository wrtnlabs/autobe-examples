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

export async function test_api_subscription_detail_after_unsubscribe(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the first member (community owner/creator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create a community as the first member
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register the second member (the subscriber)
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
  // Capture the subscription ID before unsubscribing
  const subscriptionId = subscription.id;
  // Step 5: Unsubscribe the second member from the community
  await api.functional.community.member.communities.subscriptions.erase(
    subscriberConnection,
    {
      communityId: community.id,
    },
  );
  // Step 6: Retrieve the subscription by ID as the second member
  // The endpoint must return the subscription even though it's inactive
  const retrieved = await api.functional.community.member.subscriptions.at(
    subscriberConnection,
    {
      subscriptionId: subscriptionId,
    },
  );
  typia.assert(retrieved);
  // Validate: subscription ID matches the captured one
  TestValidator.equals("subscription id matches", retrieved.id, subscriptionId);
  // Validate: deleted_at is non-null (confirms the subscription was cancelled)
  TestValidator.predicate(
    "deleted_at is non-null after unsubscribe",
    retrieved.deleted_at !== null,
  );
  // Validate: community.id matches the created community
  TestValidator.equals(
    "community id matches",
    retrieved.community.id,
    community.id,
  );
  // Validate: member.id matches the subscribing member
  TestValidator.equals("member id matches", retrieved.member.id, subscriber.id);
}
