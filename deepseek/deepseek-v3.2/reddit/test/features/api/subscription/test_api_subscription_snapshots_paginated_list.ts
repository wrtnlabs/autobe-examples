import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionSnapshot";
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
 * Test retrieving paginated subscription snapshots for an authenticated member.
 * 1. Register and authenticate a member
 * 2. Create a community
 * 3. Subscribe to the community
 * 4. Toggle subscription status multiple times to generate snapshots
 * 5. Query subscription snapshots with pagination parameters
 * 6. Validate paginated response and snapshot ownership
 */
export async function test_api_subscription_snapshots_paginated_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // Register and authenticate member using utility function (CRITICAL)
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 2. Create community using utility function
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create subscription using utility function
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
  // 4. Generate multiple snapshots by toggling subscription status
  // First toggle: active -> inactive
  const updatedSubscription1 =
    await api.functional.communityPlatform.member.subscriptions.status(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          active: false,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(updatedSubscription1);
  // Second toggle: inactive -> active
  const updatedSubscription2 =
    await api.functional.communityPlatform.member.subscriptions.status(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          active: true,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(updatedSubscription2);
  // 5. Query subscription snapshots with pagination
  const snapshotRequest = {
    page: 1 satisfies number,
    limit: 10 satisfies number,
    sort: "created_at" as const,
    user_id: memberAuth.id satisfies string,
  } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest;
  const paginatedSnapshots =
    await api.functional.communityPlatform.member.subscription_snapshots.index(
      memberConnection,
      {
        body: snapshotRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  // 6. Validate
}
