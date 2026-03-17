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

export async function test_api_subscription_restore_inactive_membership(
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
  const targetCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(targetCommunity);
  const otherCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);
  const targetSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_slug: targetCommunity.slug,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(targetSubscription);
  const otherSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_slug: otherCommunity.slug,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(otherSubscription);
  const targetSubscriptionDetail =
    await api.functional.communityPlatform.member.communities.subscription.at(
      memberConnection,
      {
        communityId: targetCommunity.id,
      },
    );
  typia.assert(targetSubscriptionDetail);
  const otherSubscriptionDetail =
    await api.functional.communityPlatform.member.communities.subscription.at(
      memberConnection,
      {
        communityId: otherCommunity.id,
      },
    );
  typia.assert(otherSubscriptionDetail);
  TestValidator.equals(
    "target subscription references target community",
    targetSubscription.community.id,
    targetCommunity.id,
  );
  TestValidator.equals(
    "other subscription references other community",
    otherSubscription.community.id,
    otherCommunity.id,
  );
  TestValidator.predicate(
    "target subscription is active",
    targetSubscriptionDetail.active,
  );
  TestValidator.predicate(
    "other subscription is active",
    otherSubscriptionDetail.active,
  );
  TestValidator.notEquals(
    "subscriptions for different communities are different records",
    targetSubscriptionDetail.id,
    otherSubscriptionDetail.id,
  );
  TestValidator.equals(
    "target detail keeps target community",
    targetSubscriptionDetail.community.id,
    targetCommunity.id,
  );
  TestValidator.equals(
    "other detail keeps other community",
    otherSubscriptionDetail.community.id,
    otherCommunity.id,
  );
  await TestValidator.error(
    "duplicate active subscription is rejected without affecting other community membership",
    async () => {
      await generate_random_community_platform_member_subscriptions_create(
        memberConnection,
        {
          body: {
            community_slug: targetCommunity.slug,
          } satisfies ICommunityPlatformSubscription.ICreate,
        },
      );
    },
  );
  const targetSubscriptionAfterDuplicate =
    await api.functional.communityPlatform.member.communities.subscription.at(
      memberConnection,
      {
        communityId: targetCommunity.id,
      },
    );
  typia.assert(targetSubscriptionAfterDuplicate);
  const otherSubscriptionAfterDuplicate =
    await api.functional.communityPlatform.member.communities.subscription.at(
      memberConnection,
      {
        communityId: otherCommunity.id,
      },
    );
  typia.assert(otherSubscriptionAfterDuplicate);
  TestValidator.equals(
    "target subscription record remains unchanged after duplicate attempt",
    targetSubscriptionAfterDuplicate.id,
    targetSubscriptionDetail.id,
  );
  TestValidator.equals(
    "other subscription record remains unchanged after duplicate attempt",
    otherSubscriptionAfterDuplicate.id,
    otherSubscriptionDetail.id,
  );
  TestValidator.equals(
    "target community binding remains unchanged after duplicate attempt",
    targetSubscriptionAfterDuplicate.community.id,
    targetCommunity.id,
  );
  TestValidator.equals(
    "other community binding remains unchanged after duplicate attempt",
    otherSubscriptionAfterDuplicate.community.id,
    otherCommunity.id,
  );
  TestValidator.predicate(
    "target subscription remains active after duplicate attempt",
    targetSubscriptionAfterDuplicate.active,
  );
  TestValidator.predicate(
    "other subscription remains active after duplicate attempt",
    otherSubscriptionAfterDuplicate.active,
  );
}
