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

export async function test_api_subscription_detail_not_found_after_unsubscribe(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  const subscription: ICommunityPlatformSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_slug: community.slug,
        },
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community matches created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.predicate("subscription is active", subscription.active);
  const subscriptionDetailBefore: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.communities.subscription.at(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscriptionDetailBefore);
  TestValidator.equals(
    "subscription detail before unsubscribe matches created subscription",
    subscriptionDetailBefore.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription detail before unsubscribe targets same community",
    subscriptionDetailBefore.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription detail before unsubscribe is active",
    subscriptionDetailBefore.active,
  );
  await api.functional.communityPlatform.member.communities.subscription.erase(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  await TestValidator.httpError(
    "subscription detail is not found after unsubscribe",
    404,
    async () => {
      await api.functional.communityPlatform.member.communities.subscription.at(
        memberConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
}
