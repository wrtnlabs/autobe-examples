import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_communities_moderation_roles_create";
import { generate_random_community_platform_member_communities_subscriptions_create } from "../../../generate/generate_random_community_platform_member_communities_subscriptions_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_community_ban_retrieve_by_community_scope(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(owner);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: "https://example.com/icon.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_member_communities_subscriptions_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          subscriptionStatus: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  const moderationRole =
    await generate_random_community_platform_member_communities_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          communityPlatformMemberId: owner.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderationRole);
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphabets(13),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar2.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(target);
  const activeBan =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          communityPlatformMemberId: target.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          startedAt: new Date().toISOString(),
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(activeBan);
  const retrievedActive =
    await api.functional.communityPlatform.member.communities.bans.at(
      ownerConnection,
      {
        communityId: community.id,
        banId: activeBan.id,
      },
    );
  typia.assert(retrievedActive);
  TestValidator.equals("active ban id", retrievedActive.id, activeBan.id);
  TestValidator.equals(
    "active ban community",
    retrievedActive.community,
    activeBan.community,
  );
  TestValidator.equals(
    "active ban member",
    retrievedActive.member,
    activeBan.member,
  );
  TestValidator.equals(
    "active ban reason",
    retrievedActive.reason,
    activeBan.reason,
  );
  TestValidator.equals(
    "active ban startedAt",
    retrievedActive.startedAt,
    activeBan.startedAt,
  );
  TestValidator.equals(
    "active ban endedAt",
    retrievedActive.endedAt,
    activeBan.endedAt,
  );
  TestValidator.equals(
    "active ban createdAt",
    retrievedActive.createdAt,
    activeBan.createdAt,
  );
  TestValidator.equals(
    "active ban updatedAt",
    retrievedActive.updatedAt,
    activeBan.updatedAt,
  );
  TestValidator.equals(
    "active ban deletedAt",
    retrievedActive.deletedAt,
    activeBan.deletedAt,
  );
  const historicalBan =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          communityPlatformMemberId: owner.id,
          reason: RandomGenerator.paragraph({ sentences: 4 }),
          startedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          endedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(historicalBan);
  const retrievedHistorical =
    await api.functional.communityPlatform.member.communities.bans.at(
      ownerConnection,
      {
        communityId: community.id,
        banId: historicalBan.id,
      },
    );
  typia.assert(retrievedHistorical);
  TestValidator.equals(
    "historical ban id",
    retrievedHistorical.id,
    historicalBan.id,
  );
  TestValidator.equals(
    "historical ban community",
    retrievedHistorical.community,
    historicalBan.community,
  );
  TestValidator.equals(
    "historical ban member",
    retrievedHistorical.member,
    historicalBan.member,
  );
  TestValidator.equals(
    "historical ban reason",
    retrievedHistorical.reason,
    historicalBan.reason,
  );
  TestValidator.equals(
    "historical ban startedAt",
    retrievedHistorical.startedAt,
    historicalBan.startedAt,
  );
  TestValidator.equals(
    "historical ban endedAt",
    retrievedHistorical.endedAt,
    historicalBan.endedAt,
  );
  TestValidator.equals(
    "historical ban createdAt",
    retrievedHistorical.createdAt,
    historicalBan.createdAt,
  );
  TestValidator.equals(
    "historical ban updatedAt",
    retrievedHistorical.updatedAt,
    historicalBan.updatedAt,
  );
  TestValidator.equals(
    "historical ban deletedAt",
    retrievedHistorical.deletedAt,
    historicalBan.deletedAt,
  );
  TestValidator.notEquals(
    "different bans should differ",
    retrievedActive.id,
    retrievedHistorical.id,
  );
}
