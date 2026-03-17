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

export async function test_api_admin_ban_snapshot_permanent_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Create member to be banned
  const memberToBanConnection: api.IConnection = { host: connection.host };
  const memberToBan = await authorize_member_join(memberToBanConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: "https://test.com/",
      referrer: "https://referrer.com/",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberToBan);
  // 3. Create a community owner to assign moderation role
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwner = await authorize_member_join(communityOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: "https://test.com/",
      referrer: "https://referrer.com/",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(communityOwner);
  // 4. Create community as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      communityOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 5. Assign moderation role to admin (required for ban creation)
  // First, admin needs to join as member to get moderator role
  const adminMemberConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: "https://test.com/",
      referrer: "https://referrer.com/",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(adminMember);
  // Owner assigns moderator role to admin member
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      communityOwnerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: adminMember.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderationRole);
  // 6. Create permanent ban (no expiresAt) using admin member connection
  const permanentBan =
    await generate_random_community_platform_member_bans_create(
      adminMemberConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: memberToBan.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expiresAt: null, // Permanent ban
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(permanentBan);
  // 7. Create snapshot of permanent ban using admin connection
  const snapshot =
    await generate_random_community_platform_admin_bans_snapshots_create(
      adminConnection,
      {
        params: { communityId: community.id, banId: permanentBan.id },
        body: {} satisfies ICommunityPlatformBanSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 8. Retrieve the snapshot via admin endpoint
  const retrievedSnapshot =
    await api.functional.communityPlatform.admin.bans.snapshots.at(
      adminConnection,
      {
        communityId: community.id,
        banId: permanentBan.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 9. Validate snapshot reflects permanent ban characteristics
  TestValidator.equals(
    "snapshot ID matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot ban ID matches",
    retrievedSnapshot.ban.id,
    permanentBan.id,
  );
  TestValidator.equals(
    "snapshot reason matches ban reason",
    retrievedSnapshot.snapshotReason,
    permanentBan.reason,
  );
  TestValidator.equals(
    "snapshot banned_at matches",
    retrievedSnapshot.snapshotBannedAt,
    permanentBan.banned_at,
  );
  // CRITICAL: Verify snapshot_expires_at is null for permanent ban
  TestValidator.equals(
    "snapshot_expires_at should be null for permanent ban",
    retrievedSnapshot.snapshotExpiresAt,
    null,
  );
  TestValidator.equals(
    "snapshot_unbanned_at should be null for active permanent ban",
    retrievedSnapshot.snapshotUnbannedAt,
    null,
  );
  // CRITICAL: Verify snapshot_active is true (permanent bans don't expire automatically)
  TestValidator.equals(
    "snapshot_active should be true for permanent ban",
    retrievedSnapshot.snapshotActive,
    true,
  );
}
