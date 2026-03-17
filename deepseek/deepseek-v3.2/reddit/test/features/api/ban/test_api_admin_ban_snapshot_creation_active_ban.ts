import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanSnapshot";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_admin_bans_snapshots_create } from "../../../generate/generate_random_community_platform_admin_bans_snapshots_create";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_ban_snapshot } from "../../../prepare/prepare_random_community_platform_ban_snapshot";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_admin_ban_snapshot_creation_active_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoin);
  // Admin login using utility function
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Member setup for community creation (owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Create community as member (becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Create target member for banning
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMemberAuth = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(targetMemberAuth);
  // 5. Member (owner) assigns moderator role to admin
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      memberConnection,
      {
        body: {
          memberId: adminAuth.id,
          roleType: "moderator",
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderationRole);
  TestValidator.equals(
    "moderation role assigned to admin",
    moderationRole.member.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "moderation role type",
    moderationRole.roleType,
    "moderator",
  );
  // 6. Admin creates ban on target member
  const ban = await generate_random_community_platform_member_bans_create(
    adminConnection,
    {
      body: {
        memberId: targetMemberAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  TestValidator.equals(
    "ban targets correct member",
    ban.bannedMember.id,
    targetMemberAuth.id,
  );
  TestValidator.equals(
    "ban is in correct community",
    ban.community.id,
    community.id,
  );
  TestValidator.predicate("ban is active", ban.active);
  TestValidator.predicate("ban has unbanned_at null", ban.unbanned_at === null);
  TestValidator.predicate(
    "ban has expires_at not null",
    ban.expires_at !== null,
  );
  // 7. Admin creates ban snapshot
  const snapshot =
    await generate_random_community_platform_admin_bans_snapshots_create(
      adminConnection,
      {
        body: {},
        params: {
          communityId: community.id,
          banId: ban.id,
        },
      },
    );
  typia.assert(snapshot);
  // 8. Validate snapshot matches current ban state (business logic validation)
  TestValidator.equals("snapshot ban reference", snapshot.ban.id, ban.id);
  TestValidator.equals(
    "snapshot reason matches",
    snapshot.snapshotReason,
    ban.reason,
  );
  TestValidator.equals(
    "snapshot banned_at matches",
    snapshot.snapshotBannedAt,
    ban.banned_at,
  );
  TestValidator.equals(
    "snapshot expires_at matches",
    snapshot.snapshotExpiresAt,
    ban.expires_at,
  );
  TestValidator.equals(
    "snapshot unbanned_at matches",
    snapshot.snapshotUnbannedAt,
    ban.unbanned_at,
  );
  TestValidator.equals(
    "snapshot active matches",
    snapshot.snapshotActive,
    ban.active,
  );
  // 9. Validate audit fields existence (business logic)
  TestValidator.predicate(
    "snapshot has createdAt audit field",
    snapshot.createdAt !== null && snapshot.createdAt !== undefined,
  );
  TestValidator.predicate(
    "snapshot has updatedAt audit field",
    snapshot.updatedAt !== null && snapshot.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "snapshot deletedAt is null for active snapshot",
    snapshot.deletedAt === null,
  );
}
