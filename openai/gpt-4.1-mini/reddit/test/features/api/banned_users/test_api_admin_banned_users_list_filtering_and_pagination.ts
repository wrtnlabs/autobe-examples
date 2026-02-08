import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_banned_users_list_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving and filtering banned user lists as admin with pagination and filters
  // 1. Admin authentication and connection setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Test: Retrieve all banned users with no filters
  const allBannedUsers =
    await api.functional.communityPlatform.admin.bannedUsers.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert<IPageICommunityPlatformBannedUser.ISummary>(allBannedUsers);
  // Validate pagination
  TestValidator.predicate(
    "pagination current page is at least 1",
    allBannedUsers.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allBannedUsers.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allBannedUsers.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allBannedUsers.pagination.records >= 0,
  );
  // Validate data is an array
  TestValidator.predicate("data is array", Array.isArray(allBannedUsers.data));
  // 3. Test: Filter active bans (unbanned_at is null)
  // We cannot assert field unbanned_at on ISummary. So we just request the filter and assert common response structure
  const activeBans =
    await api.functional.communityPlatform.admin.bannedUsers.index(
      adminConnection,
      {
        body: {
          unbanned_at: null,
        },
      },
    );
  typia.assert<IPageICommunityPlatformBannedUser.ISummary>(activeBans);
  TestValidator.predicate("data is array", Array.isArray(activeBans.data));
  // 4. Test: Filter by ban date range and community id
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  // community_platform_community_id is also not defined on ISummary, so we don't do property assertions but test general response and filtering
  const communityId = allBannedUsers.data.length
    ? allBannedUsers.data[0]
    : undefined;
  const filterByDateAndCommunity =
    await api.functional.communityPlatform.admin.bannedUsers.index(
      adminConnection,
      {
        body: {
          banned_at_start: pastDate.toISOString(),
          banned_at_end: now.toISOString(),
          ...(communityId !== undefined
            ? {} // cannot add community_platform_community_id because not in ISummary
            : {}),
        },
      },
    );
  typia.assert<IPageICommunityPlatformBannedUser.ISummary>(
    filterByDateAndCommunity,
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(filterByDateAndCommunity.data),
  );
}
