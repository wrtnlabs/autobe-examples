import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_subscription_new_community_join(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a target community to subscribe to
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Store initial subscriber count (should be 0)
  const initialSubscriberCount = community.subscriberCount;
  TestValidator.equals(
    "community initial subscriber count is 0",
    initialSubscriberCount,
    0,
  );
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Validate subscription response
  // 4.1 Subscription is active
  TestValidator.equals("subscription is active", subscription.is_active, true);
  // 4.2 Member matches authenticated member
  TestValidator.equals(
    "subscription member id matches",
    subscription.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "subscription member username matches",
    subscription.member.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "subscription member display_name matches",
    subscription.member.display_name,
    memberAuth.displayName,
  );
  // 4.3 Community matches created community
  TestValidator.equals(
    "subscription community id matches",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription community name matches",
    subscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "subscription community description matches",
    subscription.community.description,
    community.description,
  );
  // 4.4 Timestamps are set
  TestValidator.predicate(
    "subscription created_at is valid date-time",
    typeof subscription.created_at === "string" &&
      subscription.created_at.length > 0,
  );
  TestValidator.predicate(
    "subscription updated_at is valid date-time",
    typeof subscription.updated_at === "string" &&
      subscription.updated_at.length > 0,
  );
  // 5. Validate subscriber count was incremented
  TestValidator.equals(
    "community subscriber count incremented to 1",
    subscription.community.subscriber_count,
    initialSubscriberCount + 1,
  );
}
