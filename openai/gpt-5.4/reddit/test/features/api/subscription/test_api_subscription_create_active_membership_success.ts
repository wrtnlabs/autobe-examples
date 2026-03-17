import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
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

export async function test_api_subscription_create_active_membership_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const communitySlug = `community-${RandomGenerator.alphabets(8)}`;
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: communitySlug,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_slug: community.slug,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community id matches created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription community slug matches created community",
    subscription.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "subscription community title matches created community",
    subscription.community.title,
    community.title,
  );
  TestValidator.equals(
    "subscription community description matches created community",
    subscription.community.description,
    community.description,
  );
  TestValidator.equals(
    "subscription member id comes from authenticated session",
    subscription.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "subscription member code comes from authenticated session",
    subscription.member.code,
    authorized.code,
  );
  TestValidator.equals(
    "subscription member email comes from authenticated session",
    subscription.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "subscription member status comes from authenticated session",
    subscription.member.status,
    authorized.status,
  );
  TestValidator.equals(
    "subscription is active membership link",
    subscription.active,
    true,
  );
  TestValidator.equals(
    "subscription deleted_at is null for active membership",
    subscription.deleted_at,
    null,
  );
  TestValidator.equals(
    "subscription member deleted_at is null",
    subscription.member.deleted_at,
    null,
  );
  TestValidator.equals(
    "subscription member account deletion state matches authorized member",
    subscription.member.deleted_at,
    authorized.deletedAt,
  );
  TestValidator.equals(
    "subscription community deletion state matches created community",
    subscription.community.deleted_at,
    community.deleted_at,
  );
}
