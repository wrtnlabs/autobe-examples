import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMvCommunitySubscriberCount } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMvCommunitySubscriberCount";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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

/**
 * Test retrieving subscriber count for an existing community with subscribers.
 * 1. Create member account
 * 2. Create community
 * 3. Verify initial subscriber count is 0
 * 4. Create subscription
 * 5. Verify subscriber count increments to 1
 * 6. Verify guest can access endpoint successfully
 */
export async function test_api_community_subscribers_count_existing_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community with proper name format (lowercase alphanumeric)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Verify initial subscriber count is 0 (guest access)
  const initialCount =
    await api.functional.communityPlatform.communities.subscribers.count.at(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(initialCount);
  TestValidator.equals(
    "initial subscriber count should be 0",
    initialCount.subscriber_count,
    0,
  );
  TestValidator.predicate(
    "initial count should have valid community summary",
    () =>
      initialCount.community.id === community.id &&
      initialCount.community.name === community.name,
  );
  TestValidator.predicate(
    "initial count should have updated_at timestamp",
    () =>
      initialCount.updated_at &&
      new Date(initialCount.updated_at) instanceof Date,
  );
  // 4. Create subscription and verify creation
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription should be active",
    subscription.active,
    true,
  );
  TestValidator.equals(
    "subscription community ID should match",
    subscription.community.id,
    community.id,
  );
  // 5. Verify subscriber count increments to 1
  const finalCount =
    await api.functional.communityPlatform.communities.subscribers.count.at(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(finalCount);
  TestValidator.equals(
    "subscriber count should be 1 after subscription",
    finalCount.subscriber_count,
    1,
  );
  TestValidator.equals(
    "community ID should match",
    finalCount.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name should match",
    finalCount.community.name,
    community.name,
  );
  TestValidator.predicate(
    "updated_at should be present",
    () =>
      finalCount.updated_at && new Date(finalCount.updated_at) instanceof Date,
  );
  TestValidator.notEquals(
    "updated_at should change after subscription",
    initialCount.updated_at,
    finalCount.updated_at,
  );
  // 6. Verify guest (unauthenticated user) can access endpoint with same data
  const guestCount =
    await api.functional.communityPlatform.communities.subscribers.count.at(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(guestCount);
  TestValidator.equals(
    "guest should see same count as member",
    guestCount.subscriber_count,
    finalCount.subscriber_count,
  );
  TestValidator.equals(
    "guest should see same community ID",
    guestCount.community.id,
    finalCount.community.id,
  );
}
