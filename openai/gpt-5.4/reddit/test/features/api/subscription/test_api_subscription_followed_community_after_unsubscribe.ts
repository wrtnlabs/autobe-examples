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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
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

export async function test_api_subscription_followed_community_after_unsubscribe(
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
  const removableCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(removableCommunity);
  const retainedCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(retainedCommunity);
  const removableSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_slug: removableCommunity.slug,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(removableSubscription);
  const retainedSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_slug: retainedCommunity.slug,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(retainedSubscription);
  const requestBody = {
    page: 1,
    limit: 100,
  } satisfies ICommunityPlatformCommunity.IRequest;
  const beforeRemoval =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(beforeRemoval);
  const beforeRemovable = beforeRemoval.data.find(
    (community) => community.id === removableCommunity.id,
  );
  const beforeRetained = beforeRemoval.data.find(
    (community) => community.id === retainedCommunity.id,
  );
  TestValidator.predicate(
    "followed communities include removable community before unsubscribe",
    beforeRemovable !== undefined,
  );
  TestValidator.predicate(
    "followed communities include retained community before unsubscribe",
    beforeRetained !== undefined,
  );
  if (beforeRemovable === undefined) {
    throw new Error("Expected removable community to exist before unsubscribe.");
  }
  if (beforeRetained === undefined) {
    throw new Error("Expected retained community to exist before unsubscribe.");
  }
  typia.assertGuard(beforeRemovable);
  typia.assertGuard(beforeRetained);
  TestValidator.equals(
    "removable community subscriber count before unsubscribe",
    beforeRemovable.subscriber_count,
    1,
  );
  TestValidator.equals(
    "retained community subscriber count before unsubscribe",
    beforeRetained.subscriber_count,
    1,
  );
  await api.functional.communityPlatform.member.communities.subscription.erase(
    memberConnection,
    {
      communityId: removableCommunity.id,
    },
  );
  const afterRemoval =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(afterRemoval);
  const afterRemovable = afterRemoval.data.find(
    (community) => community.id === removableCommunity.id,
  );
  const afterRetained = afterRemoval.data.find(
    (community) => community.id === retainedCommunity.id,
  );
  TestValidator.equals(
    "unsubscribed community removed from followed communities",
    afterRemovable,
    undefined,
  );
  TestValidator.predicate(
    "other active subscription remains in followed communities",
    afterRetained !== undefined,
  );
  if (afterRetained === undefined) {
    throw new Error("Expected retained community to exist after unsubscribe.");
  }
  typia.assertGuard(afterRetained);
  TestValidator.equals(
    "retained community subscriber count remains based on active subscriptions only",
    afterRetained.subscriber_count,
    1,
  );
}
