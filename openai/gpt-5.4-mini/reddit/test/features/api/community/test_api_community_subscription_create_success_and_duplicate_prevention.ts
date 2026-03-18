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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscriptions_create } from "../../../generate/generate_random_community_platform_member_communities_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_subscription_create_success_and_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const authenticatedMemberConnection: api.IConnection = memberConnection;
  const community =
    await generate_random_community_platform_member_communities_create(
      authenticatedMemberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const created =
    await generate_random_community_platform_member_communities_subscriptions_create(
      authenticatedMemberConnection,
      {
        params: { communityId: community.id },
        body: {
          subscriptionStatus: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.predicate(
    "subscription status is active",
    created.subscription_status === "active",
  );
  TestValidator.predicate(
    "subscription created timestamp exists",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "subscription updated timestamp exists",
    created.updated_at.length > 0,
  );
  TestValidator.equals("subscription not deleted", created.deleted_at, null);
  const duplicate =
    await generate_random_community_platform_member_communities_subscriptions_create(
      authenticatedMemberConnection,
      {
        params: { communityId: community.id },
        body: {
          subscriptionStatus: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(duplicate);
  TestValidator.equals(
    "duplicate keeps same subscription status",
    duplicate.subscription_status,
    created.subscription_status,
  );
  TestValidator.equals(
    "duplicate keeps same active state",
    duplicate.deleted_at,
    created.deleted_at,
  );
  TestValidator.equals(
    "duplicate does not create a new record",
    duplicate.id,
    created.id,
  );
}
