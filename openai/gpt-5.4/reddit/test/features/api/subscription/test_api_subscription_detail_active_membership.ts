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

export async function test_api_subscription_detail_active_membership(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorizedMember);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_slug: community.slug,
        },
      },
    );
  typia.assert(subscription);
  const subscriberCountBefore = subscription.community.subscriber_count;
  const detail =
    await api.functional.communityPlatform.member.communities.subscription.at(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "subscription id remains the same",
    detail.id,
    subscription.id,
  );
  TestValidator.equals("subscription remains active", detail.active, true);
  TestValidator.equals(
    "subscription deleted_at unchanged",
    detail.deleted_at,
    subscription.deleted_at,
  );
  TestValidator.equals(
    "community id matches created community",
    detail.community.id,
    community.id,
  );
  TestValidator.equals(
    "community slug matches created community",
    detail.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "community title matches created community",
    detail.community.title,
    community.title,
  );
  TestValidator.equals(
    "community description matches created community",
    detail.community.description,
    community.description,
  );
  TestValidator.equals(
    "community status matches created community",
    detail.community.status,
    community.status,
  );
  TestValidator.equals(
    "community owner id matches authenticated caller",
    detail.community.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "community owner code matches authenticated caller",
    detail.community.member.code,
    authorizedMember.code,
  );
  TestValidator.equals(
    "community owner email matches authenticated caller",
    detail.community.member.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "community owner status matches authenticated caller",
    detail.community.member.status,
    authorizedMember.status,
  );
  TestValidator.equals(
    "community subscriber_count unchanged by lookup",
    detail.community.subscriber_count,
    subscriberCountBefore,
  );
  TestValidator.equals(
    "member id matches authenticated caller",
    detail.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member code matches authenticated caller",
    detail.member.code,
    authorizedMember.code,
  );
  TestValidator.equals(
    "member email matches authenticated caller",
    detail.member.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "member status matches authenticated caller",
    detail.member.status,
    authorizedMember.status,
  );
  TestValidator.equals(
    "member id matches created subscription",
    detail.member.id,
    subscription.member.id,
  );
  TestValidator.equals(
    "member code matches created subscription",
    detail.member.code,
    subscription.member.code,
  );
  TestValidator.equals(
    "member email matches created subscription",
    detail.member.email,
    subscription.member.email,
  );
  TestValidator.equals(
    "member status matches created subscription",
    detail.member.status,
    subscription.member.status,
  );
}
