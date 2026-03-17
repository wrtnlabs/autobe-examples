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
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

/**
 * Test admin ban snapshot listing functionality with various filtering options.
 *
 * 1. Admin views a community ban's audit trail to understand ban evolution
 * 2. Test successful retrieval with pagination and filters
 * 3. Validate error handling for non-existent ban and permission issues
 */
export async function test_api_admin_ban_snapshots_list_by_community(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Setup admin account
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // 2. Setup member account (community owner)
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(memberAuth);
  // 3. Create community as member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12)
            .toLowerCase()
            .replace(/\d/g, ""),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Assign moderation role to admin in the community
  const moderationRole =
    await api.functional.communityPlatform.member.moderation_roles.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          memberId: adminAuth.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderationRole);
  // 5. Create a ban record in the community
  const ban = await api.functional.communityPlatform.member.bans.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        memberId: memberAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expiresAt: null, // Permanent ban
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(ban);
  // 6. Admin login to get fresh connection with admin token
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 7. Test successful retrieval with default pagination
  const response =
    await api.functional.communityPlatform.admin.bans.snapshots.index(
      adminLoginConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformBanSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.predicate(
    "response has pagination data",
    () => response.pagination !== undefined,
  );
  TestValidator.predicate("response has data array", () =>
    Array.isArray(response.data),
  );
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    response.pagination.pages >= 0,
  );
  // 8. Test with search filter
  const searchResponse =
    await api.functional.communityPlatform.admin.bans.snapshots.index(
      adminLoginConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          search: ban.reason.substring(0, 5),
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformBanSnapshot.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 9. Test with timestamp filters
  const now = new Date().toISOString();
  const timestampResponse =
    await api.functional.communityPlatform.admin.bans.snapshots.index(
      adminLoginConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          snapshot_banned_at_from: ban.banned_at,
          snapshot_banned_at_to: now,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformBanSnapshot.IRequest,
      },
    );
  typia.assert(timestampResponse);
  // 10. Test with active status filter
  const activeResponse =
    await api.functional.communityPlatform.admin.bans.snapshots.index(
      adminLoginConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          snapshot_active: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformBanSnapshot.IRequest,
      },
    );
  typia.assert(activeResponse);
  // 11. Test error handling - non-existent ban
  await TestValidator.error(
    "should return 404 for non-existent ban",
    async () => {
      await api.functional.communityPlatform.admin.bans.snapshots.index(
        adminLoginConnection,
        {
          communityId: community.id,
          banId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformBanSnapshot.IRequest,
        },
      );
    },
  );
  // 12. Test error handling - non-existent community
  await TestValidator.error(
    "should return 404 for non-existent community",
    async () => {
      await api.functional.communityPlatform.admin.bans.snapshots.index(
        adminLoginConnection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          banId: ban.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformBanSnapshot.IRequest,
        },
      );
    },
  );
  // 13. Test error handling - admin without moderation permissions (create another admin without role)
  const anotherAdminConnection: api.IConnection = { host: connection.host };
  const anotherAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(anotherAdminConnection, {
    body: anotherAdminCredentials,
  });
  const anotherAdminLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_login(anotherAdminLoginConnection, {
    body: {
      email: anotherAdminCredentials.email,
      password: anotherAdminCredentials.password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  await TestValidator.error(
    "should return 403 for admin without moderation permissions",
    async () => {
      await api.functional.communityPlatform.admin.bans.snapshots.index(
        anotherAdminLoginConnection,
        {
          communityId: community.id,
          banId: ban.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformBanSnapshot.IRequest,
        },
      );
    },
  );
}
