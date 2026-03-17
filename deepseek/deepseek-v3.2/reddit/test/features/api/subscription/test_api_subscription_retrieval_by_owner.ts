import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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

export async function test_api_subscription_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Create community for subscription
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Create subscription
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
  // Retrieve the subscription
  const retrieved =
    await api.functional.communityPlatform.member.subscriptions.at(
      memberConnection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrieved);
  // Validate response structure
  TestValidator.equals(
    "subscription ID matches",
    retrieved.id,
    subscription.id,
  );
  TestValidator.predicate("active status is true", retrieved.active);
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  TestValidator.predicate(
    "created_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(retrieved.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(retrieved.updated_at),
  );
  // Validate member relationship
  TestValidator.equals(
    "member ID matches",
    retrieved.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member email matches",
    retrieved.member.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "member username matches",
    retrieved.member.username,
    authorizedMember.username,
  );
  // Validate community relationship
  TestValidator.equals(
    "community ID matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrieved.community.name,
    community.name,
  );
  // Test unauthorized access - create second member
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {});
  typia.assert(otherMember);
  // Should get 403 Forbidden when other member tries to access
  await TestValidator.error(
    "other member cannot access subscription",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.at(
        otherMemberConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
  // Test non-existent subscription
  await TestValidator.error(
    "non-existent subscription returns error",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.at(
        memberConnection,
        {
          subscriptionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
