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

export async function test_api_admin_ban_snapshot_creation_lifted_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create separate member account for the admin (needed for moderator role)
  const adminMemberConnection: api.IConnection = { host: connection.host };
  const adminMemberAuth = await authorize_member_join(adminMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(adminMemberAuth);
  // 3. Member setup for community owner (different from admin)
  const ownerMemberConnection: api.IConnection = { host: connection.host };
  const ownerMemberAuth = await authorize_member_join(ownerMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerMemberAuth);
  // 4. Create community as owner member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      ownerMemberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 5. Assign moderator role to admin's member account in the community
  const moderatorRole =
    await api.functional.communityPlatform.member.moderation_roles.create(
      ownerMemberConnection,
      {
        communityId: community.id,
        body: {
          memberId: adminMemberAuth.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderatorRole);
  // 6. Create another member to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 7. Create ban as admin (using admin connection with moderator privileges)
  const ban = await api.functional.communityPlatform.member.bans.create(
    adminMemberConnection, // Use admin's member connection (has moderator role)
    {
      communityId: community.id,
      body: {
        memberId: bannedMemberAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(ban);
  // 8. Lift the ban (set active to false)
  const updatedBan = await api.functional.communityPlatform.member.bans.update(
    adminMemberConnection,
    {
      communityId: community.id,
      banId: ban.id,
      body: {
        active: false,
      } satisfies ICommunityPlatformBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  TestValidator.predicate("ban should be inactive", !updatedBan.active);
  TestValidator.predicate(
    "ban should have unbanned_at timestamp",
    updatedBan.unbanned_at !== null,
  );
  // 9. Create ban snapshot as admin
  const snapshot =
    await generate_random_community_platform_admin_bans_snapshots_create(
      adminMemberConnection,
      {
        body: {},
        params: {
          communityId: community.id,
          banId: ban.id,
        },
      },
    );
  typia.assert(snapshot);
  // 10. Validate snapshot captured lifted ban state
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
    updatedBan.unbanned_at,
  );
  TestValidator.equals(
    "snapshot active should be false",
    snapshot.snapshotActive,
    false,
  );
  TestValidator.equals(
    "snapshot references correct ban",
    snapshot.ban.id,
    ban.id,
  );
}
