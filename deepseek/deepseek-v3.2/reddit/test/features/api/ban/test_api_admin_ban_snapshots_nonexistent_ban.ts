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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBanSnapshot";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

/**
 * Admin attempts to view ban snapshots for a non-existent ban to verify proper
 * 404 error handling.
 *
 * Test that when an admin provides valid community ID but invalid ban ID, the
 * system returns appropriate 404 error indicating the ban record doesn't exist.
 * Validate that the error message clearly indicates the ban wasn't found and
 * doesn't leak sensitive information. Ensure the admin has proper authentication
 * and moderation permissions for the community first. Test edge case where ban
 * ID belongs to a different community to ensure cross-community validation works
 * correctly.
 */
export async function test_api_admin_ban_snapshots_nonexistent_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create separate connections for admin and member actors
  const memberConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Create member account using utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 3. Create admin account using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 4. Member creates a community using utility function
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 5. Member assigns admin as moderator in the community using utility function
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      memberConnection,
      {
        body: {
          memberId: admin.id,
          roleType: "moderator",
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderationRole);
  // 6. Admin attempts to view snapshots for a non-existent ban
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "ban snapshots for non-existent ban should return error",
    async () => {
      await api.functional.communityPlatform.admin.bans.snapshots.index(
        adminConnection,
        {
          communityId: community.id,
          banId: nonExistentBanId,
          body: {
            search: undefined,
            snapshot_banned_at_from: undefined,
            snapshot_banned_at_to: undefined,
            snapshot_expires_at_from: undefined,
            snapshot_expires_at_to: undefined,
            snapshot_unbanned_at_from: undefined,
            snapshot_unbanned_at_to: undefined,
            snapshot_active: undefined,
            page: undefined,
            limit: undefined,
          } satisfies ICommunityPlatformBanSnapshot.IRequest,
        },
      );
    },
  );
}
