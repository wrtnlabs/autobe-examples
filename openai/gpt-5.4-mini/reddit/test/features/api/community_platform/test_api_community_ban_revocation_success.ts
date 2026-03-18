import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
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
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscriptions_create } from "../../../generate/generate_random_community_platform_member_communities_subscriptions_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_ban_revocation_success(
  connection: api.IConnection,
): Promise<void> {
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: RandomGenerator.alphabets(10),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderator);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: RandomGenerator.alphabets(10),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const targetCommunity =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 4,
            sentenceMax: 8,
          }),
          iconImageUrl: "https://example.com/icon.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(targetCommunity);
  const otherCommunity =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 4,
            sentenceMax: 8,
          }),
          iconImageUrl: "https://example.com/icon-2.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);
  const targetSubscription =
    await generate_random_community_platform_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId: targetCommunity.id },
        body: {
          subscriptionStatus: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(targetSubscription);
  const otherSubscription =
    await generate_random_community_platform_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId: otherCommunity.id },
        body: {
          subscriptionStatus: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(otherSubscription);
  const targetBan =
    await generate_random_community_platform_member_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId: targetCommunity.id },
        body: {
          communityPlatformMemberId: member.id,
          reason: "Moderation test ban",
          startedAt: new Date().toISOString(),
          endedAt: null,
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(targetBan);
  const otherBan =
    await generate_random_community_platform_member_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId: otherCommunity.id },
        body: {
          communityPlatformMemberId: member.id,
          reason: "Separate community ban must remain untouched",
          startedAt: new Date().toISOString(),
          endedAt: null,
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(otherBan);
  await api.functional.communityPlatform.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: targetCommunity.id,
      banId: targetBan.id,
    },
  );
  const postRevocationSubscription =
    await generate_random_community_platform_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId: targetCommunity.id },
        body: {
          subscriptionStatus: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(postRevocationSubscription);
  TestValidator.equals(
    "other community ban remains active and scoped independently",
    otherBan.community.id,
    otherCommunity.id,
  );
  TestValidator.equals(
    "revoked ban belonged to the target community",
    targetBan.community.id,
    targetCommunity.id,
  );
}
