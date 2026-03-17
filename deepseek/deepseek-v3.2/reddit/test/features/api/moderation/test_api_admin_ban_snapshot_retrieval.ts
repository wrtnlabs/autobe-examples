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

export async function test_api_admin_ban_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Member authentication for community creation
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
  // 3. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Assign moderation role to admin
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: adminAuth.id satisfies string &
            tags.Format<"uuid"> as string & tags.Format<"uuid">,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderationRole);
  // 5. Create another member to ban
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
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
  typia.assert(bannedMemberAuth);
  // 6. Create ban
  const ban = await generate_random_community_platform_member_bans_create(
    adminConnection,
    {
      params: { communityId: community.id },
      body: {
        memberId: bannedMemberAuth.id satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(ban);
  // 7. Create ban snapshot
  const snapshot =
    await generate_random_community_platform_admin_bans_snapshots_create(
      adminConnection,
      {
        params: { communityId: community.id, banId: ban.id },
        body: {} satisfies ICommunityPlatformBanSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 8. Retrieve specific snapshot by ID
  const retrievedSnapshot =
    await api.functional.communityPlatform.admin.bans.snapshots.at(
      adminConnection,
      {
        communityId: community.id satisfies string as string,
        banId: ban.id satisfies string as string,
        snapshotId: snapshot.id satisfies string as string,
      },
    );
  typia.assert(retrievedSnapshot);
  // 9. Validate snapshot data preservation
  TestValidator.equals(
    "snapshot ID matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals("ban relation exists", retrievedSnapshot.ban.id, ban.id);
  TestValidator.equals(
    "snapshot reason matches ban reason",
    retrievedSnapshot.snapshotReason,
    ban.reason,
  );
  TestValidator.equals(
    "snapshot banned_at matches ban banned_at",
    retrievedSnapshot.snapshotBannedAt,
    ban.banned_at,
  );
  TestValidator.equals(
    "snapshot expires_at matches ban expires_at",
    retrievedSnapshot.snapshotExpiresAt,
    ban.expires_at,
  );
  TestValidator.equals(
    "snapshot unbanned_at matches ban unbanned_at",
    retrievedSnapshot.snapshotUnbannedAt,
    ban.unbanned_at,
  );
  TestValidator.equals(
    "snapshot active matches ban active",
    retrievedSnapshot.snapshotActive,
    ban.active,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    () => typeof retrievedSnapshot.createdAt === "string",
  );
  TestValidator.predicate(
    "snapshot ban relation has correct summary",
    () => retrievedSnapshot.ban.id === ban.id,
  );
}
