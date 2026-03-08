import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";
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

export async function test_api_subscription_list_active_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a member can retrieve their list of active subscriptions
   * with proper pagination and community details.
   */
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create multiple communities
  const community1 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community2);
  // Step 3: Subscribe member to both communities
  const subscription1 =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      { body: { community_id: community1.id } },
    );
  typia.assert(subscription1);
  const subscription2 =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      { body: { community_id: community2.id } },
    );
  typia.assert(subscription2);
  // Step 4: List subscriptions with default parameters (isActive defaults to true)
  const subscriptionsResponse =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(subscriptionsResponse);
  // Step 5: Verify pagination structure
  TestValidator.equals(
    "pagination.current",
    subscriptionsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination.limit valid",
    subscriptionsResponse.pagination.limit >= 1 &&
      subscriptionsResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination.records positive",
    subscriptionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages positive",
    subscriptionsResponse.pagination.pages >= 0,
  );
  // Step 6: Verify subscription count
  TestValidator.predicate(
    "data length matches records",
    subscriptionsResponse.data.length <=
      subscriptionsResponse.pagination.records,
  );
  // Step 7: Verify each subscription has correct structure and is_active = true
  for (const subscription of subscriptionsResponse.data) {
    TestValidator.predicate(
      "subscription.id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        subscription.id,
      ),
    );
    TestValidator.equals(
      "subscription.is_active",
      subscription.is_active,
      true,
    );
    TestValidator.predicate(
      "subscription.created_at is valid date-time",
      !isNaN(Date.parse(subscription.created_at)),
    );
    // Verify community object structure
    TestValidator.predicate(
      "community.id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        subscription.community.id,
      ),
    );
    TestValidator.predicate(
      "community.name is string",
      typeof subscription.community.name === "string" &&
        subscription.community.name.length > 0,
    );
    TestValidator.predicate(
      "community.description is string",
      typeof subscription.community.description === "string",
    );
    TestValidator.predicate(
      "community.subscriber_count is positive",
      subscription.community.subscriber_count >= 0,
    );
    // icon can be null or URL
    if (subscription.community.icon !== null) {
      TestValidator.predicate(
        "community.icon is URL format when not null",
        /^https?:\/\/.+/.test(subscription.community.icon),
      );
    }
  }
  // Step 8: List subscriptions with explicit isActive = true
  const activeSubscriptionsResponse =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      { body: { isActive: true } },
    );
  typia.assert(activeSubscriptionsResponse);
  TestValidator.equals(
    "active subscriptions count",
    activeSubscriptionsResponse.data.length,
    subscriptionsResponse.data.length,
  );
  // Step 9: Verify all active subscriptions have is_active = true
  for (const subscription of activeSubscriptionsResponse.data) {
    TestValidator.equals(
      "active subscription.is_active",
      subscription.is_active,
      true,
    );
  }
  // Step 10: Verify sorting by created_at descending (most recent first)
  if (subscriptionsResponse.data.length >= 2) {
    for (let i = 0; i < subscriptionsResponse.data.length - 1; i++) {
      const current = new Date(subscriptionsResponse.data[i].created_at);
      const next = new Date(subscriptionsResponse.data[i + 1].created_at);
      TestValidator.predicate(
        "sorted by created_at descending",
        current >= next,
      );
    }
  }
}
