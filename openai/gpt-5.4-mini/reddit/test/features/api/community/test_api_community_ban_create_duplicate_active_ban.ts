import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_ban_create_duplicate_active_ban(
  connection: api.IConnection,
): Promise<void> {
  const moderatorConnection: api.IConnection = { host: connection.host };
  const targetConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      username: `moderator_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderator);
  const target = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      username: `target_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar-2.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(target);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: "https://example.com/icon.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const startedAt = new Date().toISOString();
  const firstBan =
    await api.functional.communityPlatform.member.communities.bans.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          communityPlatformMemberId: target.id,
          reason: "Initial moderation action",
          startedAt,
          endedAt: null,
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(firstBan);
  let duplicateSucceeded = false;
  let duplicateBan: ICommunityPlatformBan | null = null;
  try {
    duplicateBan =
      await api.functional.communityPlatform.member.communities.bans.create(
        moderatorConnection,
        {
          communityId: community.id,
          body: {
            communityPlatformMemberId: target.id,
            reason: "Duplicate moderation action",
            startedAt,
            endedAt: null,
          } satisfies ICommunityPlatformBan.ICreate,
        },
      );
    typia.assert(duplicateBan);
    duplicateSucceeded = true;
  } catch {
    duplicateSucceeded = false;
  }
  if (duplicateSucceeded && duplicateBan !== null) {
    TestValidator.equals(
      "duplicate ban community id matches",
      duplicateBan.community.id,
      community.id,
    );
    TestValidator.equals(
      "duplicate ban remains active",
      duplicateBan.endedAt,
      null,
    );
    TestValidator.equals("original ban remains active", firstBan.endedAt, null);
  } else {
    TestValidator.equals("original ban remains active", firstBan.endedAt, null);
    TestValidator.equals(
      "original ban reason preserved",
      firstBan.reason,
      "Initial moderation action",
    );
  }
}
