import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_ban_update_duration_rules(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const unique = RandomGenerator.alphabets(8);
  const now = Date.now();
  await authorize_admin_join(adminConnection, {
    body: {
      email: `admin-${unique}@example.com` satisfies string &
        tags.Format<"email">,
      password: "password123" satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await authorize_member_join(memberConnection, {
    body: {
      email: `member-${unique}@example.com` satisfies string &
        tags.Format<"email">,
      password: "password123" satisfies string & tags.Format<"password">,
      username: `member_${unique}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${unique}.png` satisfies string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await authorize_member_join(targetMemberConnection, {
    body: {
      email: `target-${unique}@example.com` satisfies string &
        tags.Format<"email">,
      password: "password123" satisfies string & tags.Format<"password">,
      username: `target_${unique}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri:
        `https://example.com/${RandomGenerator.alphabets(6)}.png` satisfies string &
          tags.Format<"uri">,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community-${unique}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        },
      },
    );
  typia.assert(community);
  const originalBan =
    await generate_random_community_platform_member_communities_bans_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          communityPlatformMemberId: typia.assert(
            targetMemberConnection.headers
              ? (community.owner as never)
              : (community.owner as never),
          ),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          startedAt: new Date(now - 60 * 60 * 1000).toISOString(),
          endedAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    );
  typia.assert(originalBan);
  const updatedReason = RandomGenerator.paragraph({ sentences: 3 });
  const updatedBan =
    await api.functional.communityPlatform.admin.communities.bans.update(
      adminConnection,
      {
        communityId: community.id,
        banId: originalBan.id,
        body: {
          reason: updatedReason,
          started_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
        } satisfies ICommunityPlatformBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  TestValidator.notEquals(
    "updated ban should differ from original",
    updatedBan,
    originalBan,
  );
  TestValidator.equals(
    "community id preserved",
    updatedBan.community.id,
    community.id,
  );
  TestValidator.equals("ban id preserved", updatedBan.id, originalBan.id);
  TestValidator.equals("reason updated", updatedBan.reason, updatedReason);
  TestValidator.predicate(
    "updated ban has coherent interval",
    new Date(updatedBan.startedAt).getTime() <=
      (updatedBan.endedAt !== null
        ? new Date(updatedBan.endedAt).getTime()
        : Number.POSITIVE_INFINITY),
  );
  await TestValidator.error(
    "reject incoherent ban duration update",
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.update(
        adminConnection,
        {
          communityId: community.id,
          banId: originalBan.id,
          body: {
            started_at: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
            ended_at: new Date(now + 60 * 60 * 1000).toISOString(),
          } satisfies ICommunityPlatformBan.IUpdate,
        },
      );
    },
  );
}
