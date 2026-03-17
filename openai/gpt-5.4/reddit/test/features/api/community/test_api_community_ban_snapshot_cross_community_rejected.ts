import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
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
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { generate_random_community_platform_admin_communities_bans_snapshots_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_snapshots_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_ban_snapshot } from "../../../prepare/prepare_random_community_platform_community_ban_snapshot";

export async function test_api_community_ban_snapshot_cross_community_rejected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/sign-in",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://member.example.com/join",
      referrer: "https://member.example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const communityA =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-a-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-b-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  TestValidator.notEquals(
    "communities must be distinct",
    communityA.id,
    communityB.id,
  );
  const ban =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId: communityA.id,
        },
        body: {
          community_platform_member_id: member.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          started_at: new Date().toISOString(),
          expired_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals(
    "ban belongs to community A",
    ban.community.id,
    communityA.id,
  );
  TestValidator.equals("ban targets joined member", ban.member.id, member.id);
  TestValidator.notEquals(
    "ban community differs from mismatched path community",
    ban.community.id,
    communityB.id,
  );
  await TestValidator.error(
    "reject cross-community ban snapshot creation",
    async () => {
      await generate_random_community_platform_admin_communities_bans_snapshots_create(
        adminConnection,
        {
          params: {
            communityId: communityB.id,
            banId: ban.id,
          },
          body: {} satisfies ICommunityPlatformCommunityBanSnapshot.ICreate,
        },
      );
    },
  );
}
