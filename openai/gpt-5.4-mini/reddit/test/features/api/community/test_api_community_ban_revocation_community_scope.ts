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

export async function test_api_community_ban_revocation_community_scope(
  connection: api.IConnection,
): Promise<void> {
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: `moderator_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const communityOne =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: `community_one_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: "https://example.com/icon-one.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityOne);
  const communityTwo =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: `community_two_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: "https://example.com/icon-two.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityTwo);
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: `target_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar-target.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(targetMember);
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId: communityOne.id },
        body: {
          communityPlatformMemberId: targetMember.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          startedAt: new Date().toISOString(),
          endedAt: null,
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals(
    "ban community matches target community",
    ban.community.id,
    communityOne.id,
  );
  TestValidator.equals(
    "ban member matches target member",
    ban.member,
    targetMember,
  );
  await api.functional.communityPlatform.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: communityOne.id,
      banId: ban.id,
    },
  );
  await TestValidator.httpError(
    "revoke should not be reusable for the same community ban",
    [404],
    async () =>
      await api.functional.communityPlatform.member.communities.bans.erase(
        moderatorConnection,
        {
          communityId: communityOne.id,
          banId: ban.id,
        },
      ),
  );
  await TestValidator.httpError(
    "mismatched community scope should not allow ban revocation",
    [404],
    async () =>
      await api.functional.communityPlatform.member.communities.bans.erase(
        moderatorConnection,
        {
          communityId: communityTwo.id,
          banId: ban.id,
        },
      ),
  );
}
