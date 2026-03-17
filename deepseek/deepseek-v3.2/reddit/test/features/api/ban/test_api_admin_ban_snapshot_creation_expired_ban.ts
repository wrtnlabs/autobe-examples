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

export async function test_api_admin_ban_snapshot_creation_expired_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for admin-only operations (snapshot creation)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // 2. Member (community owner) setup
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(owner);
  // 3. Create community as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create admin's member account for moderator role
  const adminMemberConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(adminMember);
  // Assign moderator role to admin's member account in community
  const moderatorRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection, // owner assigns moderator role
      {
        params: { communityId: community.id },
        body: {
          memberId: adminMember.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderatorRole);
  // 5. Create member to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(bannedMember);
  // 6. Create expired ban (expires_at in the past) using admin's member connection (has moderator role)
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const expiredBan =
    await generate_random_community_platform_member_bans_create(
      adminMemberConnection, // admin's member account has moderator role
      {
        params: { communityId: community.id },
        body: {
          memberId: bannedMember.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expiresAt: pastDate,
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(expiredBan);
  // Verify ban is expired (active should be false when expires_at in past)
  TestValidator.equals(
    "ban active status reflects expiration",
    expiredBan.active,
    false,
  );
  TestValidator.predicate("expires_at is in the past", () => {
    if (expiredBan.expires_at === null) return false;
    return new Date(expiredBan.expires_at) < new Date();
  });
  // 7. Create ban snapshot as admin (admin-only endpoint)
  const snapshot =
    await generate_random_community_platform_admin_bans_snapshots_create(
      adminConnection, // admin connection for admin-only endpoint
      {
        params: { communityId: community.id, banId: expiredBan.id },
        body: {} satisfies ICommunityPlatformBanSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 8. Validate snapshot captures expired state (business logic validation)
  TestValidator.equals(
    "snapshot reason matches ban",
    snapshot.snapshotReason,
    expiredBan.reason,
  );
  TestValidator.equals(
    "snapshot banned_at matches",
    snapshot.snapshotBannedAt,
    expiredBan.banned_at,
  );
  TestValidator.equals(
    "snapshot expires_at matches",
    snapshot.snapshotExpiresAt,
    expiredBan.expires_at,
  );
  TestValidator.equals(
    "snapshot unbanned_at matches",
    snapshot.snapshotUnbannedAt,
    expiredBan.unbanned_at,
  );
  TestValidator.equals(
    "snapshot active matches",
    snapshot.snapshotActive,
    expiredBan.active,
  );
  TestValidator.equals(
    "ban reference ID matches",
    snapshot.ban.id,
    expiredBan.id,
  );
  // Additional validation: snapshot should reflect expired status
  TestValidator.equals(
    "snapshot active is false",
    snapshot.snapshotActive,
    false,
  );
  TestValidator.predicate("snapshot expires_at is past", () => {
    if (snapshot.snapshotExpiresAt === null) return false;
    return new Date(snapshot.snapshotExpiresAt) < new Date();
  });
}
