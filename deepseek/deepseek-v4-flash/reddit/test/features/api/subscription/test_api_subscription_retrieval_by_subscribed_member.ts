import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_subscription_retrieval_by_subscribed_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // Step 4: Retrieve the subscription record
  const retrieved =
    await api.functional.communityPlatform.member.communities.subscribers.at(
      memberConnection,
      {
        communityId: community.id,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrieved);
  // Step 5: Validate business logic
  TestValidator.equals(
    "subscription id matches",
    retrieved.id,
    subscription.id,
  );
  TestValidator.equals("member id matches", retrieved.member.id, authorized.id);
  TestValidator.equals(
    "member email matches",
    retrieved.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member username matches",
    retrieved.member.username,
    authorized.username,
  );
  TestValidator.equals(
    "member deleted_at is null",
    retrieved.member.deleted_at,
    null,
  );
  TestValidator.equals(
    "community id matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrieved.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    retrieved.community.description,
    community.description,
  );
  TestValidator.predicate(
    "subscriber_count >= 1",
    retrieved.community.subscriber_count >= 1,
  );
  TestValidator.equals(
    "community owner id matches",
    retrieved.community.owner.id,
    authorized.id,
  );
  TestValidator.predicate(
    "created_at is present",
    retrieved.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrieved.updated_at !== null,
  );
}
