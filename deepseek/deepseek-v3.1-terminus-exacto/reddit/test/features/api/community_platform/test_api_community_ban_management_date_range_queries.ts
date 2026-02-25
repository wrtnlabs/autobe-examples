import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_ban_management_date_range_queries(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create test date ranges for filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Test various date range filtering scenarios
  // Test 1: Filter by banned_at date range
  const bannedAtRangeResult =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          banned_at_start: lastWeek.toISOString(),
          banned_at_end: yesterday.toISOString(),
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(bannedAtRangeResult);
  // Test 2: Filter by expires_at date range
  const expiresAtRangeResult =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          expires_at_start: tomorrow.toISOString(),
          expires_at_end: nextWeek.toISOString(),
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(expiresAtRangeResult);
  // Test 3: Combined date range filtering
  const combinedRangeResult =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          banned_at_start: lastWeek.toISOString(),
          banned_at_end: now.toISOString(),
          expires_at_start: now.toISOString(),
          expires_at_end: nextWeek.toISOString(),
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(combinedRangeResult);
  // Test 4: Status-based filtering
  const activeStatusResult =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          status: "active",
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(activeStatusResult);
  const expiredStatusResult =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          status: "expired",
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(expiredStatusResult);
  const revokedStatusResult =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          status: "revoked",
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(revokedStatusResult);
  // Test 5: Pagination with date filtering
  const paginatedResult =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          banned_at_start: lastWeek.toISOString(),
          expires_at_end: nextWeek.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Test 6: Search functionality with date ranges
  const searchResult =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          search: "test",
          banned_at_start: lastWeek.toISOString(),
          expires_at_end: nextWeek.toISOString(),
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(searchResult);
}
