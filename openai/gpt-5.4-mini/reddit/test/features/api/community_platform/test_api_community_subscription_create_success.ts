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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_subscription_create_success(
  connection: api.IConnection,
): Promise<void> {
  /** Test member subscription creation workflow. */
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: "https://example.com/community-icon.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const subscription =
    await api.functional.communityPlatform.member.communities.subscriptions.update(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription status should be active",
    subscription.subscription_status,
    "active",
  );
  TestValidator.equals(
    "subscription community id should match the created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription community name should match the created community",
    subscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "subscription community description should match the created community",
    subscription.community.description,
    community.description,
  );
  TestValidator.equals(
    "subscription community icon should match the created community",
    subscription.community.iconImageUrl,
    community.iconImageUrl,
  );
  TestValidator.equals(
    "subscription community status should match the created community",
    subscription.community.status,
    community.status,
  );
  TestValidator.equals(
    "subscription community owner should be present",
    subscription.community.owner,
    community.owner,
  );
  TestValidator.predicate(
    "subscription created_at should be populated",
    subscription.created_at.length > 0,
  );
  TestValidator.predicate(
    "subscription updated_at should be populated",
    subscription.updated_at.length > 0,
  );
  TestValidator.equals(
    "subscription deleted_at should be null",
    subscription.deleted_at,
    null,
  );
}
