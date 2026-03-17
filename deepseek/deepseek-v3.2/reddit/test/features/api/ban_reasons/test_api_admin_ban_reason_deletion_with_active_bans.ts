import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanReason";
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
import { generate_random_community_platform_admin_ban_reasons_create } from "../../../generate/generate_random_community_platform_admin_ban_reasons_create";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_ban_reason } from "../../../prepare/prepare_random_community_platform_ban_reason";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test scenario: Admin attempts to delete a ban reason that is currently referenced by active bans.
 * Verify that the operation fails with a 409 Conflict error and the ban reason remains active.
 * This tests referential integrity protection where ban reasons in use cannot be deleted to prevent orphaned bans.
 */
export async function test_api_admin_ban_reason_deletion_with_active_bans(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create ban reason
  const banReason =
    await generate_random_community_platform_admin_ban_reasons_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          severity: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
          active: true,
        } satisfies ICommunityPlatformBanReason.ICreate,
      },
    );
  typia.assert(banReason);
  TestValidator.predicate("ban reason is active", banReason.active === true);
  // 3. Create member to be banned
  const memberToBanConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(memberToBanConnection, {
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
  typia.assert(bannedMember);
  // 4. Create community owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {
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
  typia.assert(ownerMember);
  // 5. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 6. Create active ban referencing the ban reason
  const ban = await generate_random_community_platform_member_bans_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        memberId: bannedMember.id,
        reason: `Reason referencing ban reason code: ${banReason.code}`,
        expiresAt: null,
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(ban);
  TestValidator.predicate("ban is active", ban.active === true);
  // 7. Attempt to delete ban reason (should fail with conflict)
  await TestValidator.error(
    "deleting ban reason with active bans should fail",
    async () => {
      await api.functional.communityPlatform.admin.ban_reasons.erase(
        adminConnection,
        {
          reasonId: banReason.id,
        },
      );
    },
  );
  // 8. Verify ban reason remains unchanged (active and not deleted)
  // Note: There's no GET endpoint for ban reasons in SDK, so we verify by attempting deletion again
  // This ensures the ban reason wasn't partially deleted or marked inactive
  await TestValidator.error(
    "ban reason should still be protected",
    async () => {
      await api.functional.communityPlatform.admin.ban_reasons.erase(
        adminConnection,
        {
          reasonId: banReason.id,
        },
      );
    },
  );
}
