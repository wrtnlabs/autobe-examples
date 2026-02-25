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

export async function test_api_community_ban_management_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a random community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Get all bans without filters
  const allBans =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(allBans);
  TestValidator.predicate(
    "pagination data exists",
    allBans.pagination !== undefined,
  );
  TestValidator.equals("current page", allBans.pagination.current, 1);
  TestValidator.equals("limit", allBans.pagination.limit, 10);
  // Test 2: Filter by active status
  const activeBans =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          status: "active",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(activeBans);
  // Test 3: Filter by expired status
  const expiredBans =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          status: "expired",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(expiredBans);
  // Test 4: Filter by revoked status
  const revokedBans =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          status: "revoked",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(revokedBans);
  // Test 5: Search by reason text
  const searchBans =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          search: "violation",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(searchBans);
  // Test 6: Date range filtering
  const dateBans =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          banned_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          banned_at_end: new Date().toISOString(),
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(dateBans);
  // Test 7: Combined filters
  const combinedBans =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          status: "active",
          search: "spam",
          banned_at_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 2,
          limit: 3,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(combinedBans);
  TestValidator.equals("page 2", combinedBans.pagination.current, 2);
  TestValidator.equals("limit 3", combinedBans.pagination.limit, 3);
  // Validate ban record structure
  if (allBans.data.length > 0) {
    const banRecord = allBans.data[0];
    TestValidator.predicate("has user summary", banRecord.user !== undefined);
    TestValidator.predicate(
      "has moderator summary",
      banRecord.moderator !== undefined,
    );
    TestValidator.predicate(
      "has valid ban reason",
      banRecord.reason.length > 0,
    );
    TestValidator.predicate(
      "has valid status",
      ["active", "expired", "revoked"].includes(banRecord.status),
    );
    TestValidator.predicate(
      "has banned_at timestamp",
      banRecord.banned_at !== undefined,
    );
  }
}
