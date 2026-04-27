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

/**
 * Test that an authenticated member can subscribe to an existing community and the subscriber count increments.
 *
 * Validates the full subscription workflow: member registration, community creation, and subscription. Ensures the subscription record correctly references both the member and community entities, and that the community's denormalized subscriber count is atomically incremented upon subscription.
 *
 * 1. Register as a new member via the authorization utility, obtaining an authenticated session.
 * 2. Create a community with a unique name, description, and icon image via the community generation utility.
 * 3. Subscribe the authenticated member to the community via the subscription generation utility.
 * 4. Validate the subscription response matches the expected structure, member reference, and community reference.
 * 5. Verify the community's subscriber count has incremented by exactly 1 from the value observed at community creation time.
 */
export async function test_api_subscription_member_subscribes_to_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  const originalSubscriberCount = community.subscriberCount;
  // 3. Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Validate subscription references
  TestValidator.predicate(
    "subscription member id matches authorized member",
    () => subscription.member.id === authorized.id,
  );
  TestValidator.predicate(
    "subscription community id matches created community",
    () => subscription.community.id === community.id,
  );
  // 5. Verify subscriber_count incremented by 1
  TestValidator.equals(
    "subscriber count incremented by 1",
    subscription.community.subscriber_count,
    originalSubscriberCount + 1,
  );
}
