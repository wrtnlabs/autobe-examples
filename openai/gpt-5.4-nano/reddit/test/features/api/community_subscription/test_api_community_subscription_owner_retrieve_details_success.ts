import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_subscription_owner_retrieve_details_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<65535>
        >(),
        description: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<65535>
        >(),
        icon_href: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<80000>
        >(),
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
  const first =
    await api.functional.communityPlatform.communitySubscriptions.at(
      memberConnection,
      {
        communitySubscriptionId: subscription.id,
      },
    );
  typia.assert(first);
  TestValidator.equals(
    "communitySubscription id matches",
    first.id,
    subscription.id,
  );
  TestValidator.equals("member_id matches", first.member_id, memberId);
  TestValidator.equals(
    "community_id matches",
    first.community_id,
    community.id,
  );
  TestValidator.predicate(
    "subscribed_at is ISO date-time",
    Number.isFinite(Date.parse(first.subscribed_at)),
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    Number.isFinite(Date.parse(first.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    Number.isFinite(Date.parse(first.updated_at)),
  );
  TestValidator.predicate(
    "is_active is boolean",
    typeof first.is_active === "boolean",
  );
  TestValidator.equals(
    "deleted_at is null for active record",
    first.deleted_at,
    null,
  );
  const second =
    await api.functional.communityPlatform.communitySubscriptions.at(
      memberConnection,
      {
        communitySubscriptionId: subscription.id,
      },
    );
  typia.assert(second);
  TestValidator.equals("id stable across reads", second.id, first.id);
  TestValidator.equals(
    "member_id stable across reads",
    second.member_id,
    first.member_id,
  );
  TestValidator.equals(
    "community_id stable across reads",
    second.community_id,
    first.community_id,
  );
  TestValidator.equals(
    "subscribed_at stable across reads",
    second.subscribed_at,
    first.subscribed_at,
  );
  TestValidator.equals(
    "is_active stable across reads",
    second.is_active,
    first.is_active,
  );
  TestValidator.equals(
    "created_at stable across reads",
    second.created_at,
    first.created_at,
  );
  TestValidator.equals(
    "updated_at stable across reads",
    second.updated_at,
    first.updated_at,
  );
  TestValidator.equals(
    "deleted_at stable across reads",
    second.deleted_at,
    first.deleted_at,
  );
}
