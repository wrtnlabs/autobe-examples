import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_subscription_admin_retrieve_details_success(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1) Admin setup (create admin + authenticate)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2) Member setup + community subscription
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: `community-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png",
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3) Admin retrieves subscription details
  const retrieved =
    await api.functional.communityPlatform.communitySubscriptions.at(
      adminConnection,
      {
        communitySubscriptionId: subscription.id,
      },
    );
  typia.assert(retrieved);
  // 4) Validate fields match
  TestValidator.equals(
    "subscription id matches",
    retrieved.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription community_id matches",
    retrieved.community_id,
    subscription.community_id,
  );
  TestValidator.equals(
    "subscription member_id matches",
    retrieved.member_id,
    subscription.member_id,
  );
  TestValidator.equals(
    "subscription is_active matches",
    retrieved.is_active,
    subscription.is_active,
  );
  TestValidator.equals(
    "subscription deleted_at matches",
    retrieved.deleted_at,
    subscription.deleted_at,
  );
  TestValidator.equals(
    "subscription deleted_at is null",
    retrieved.deleted_at,
    null,
  );
}
