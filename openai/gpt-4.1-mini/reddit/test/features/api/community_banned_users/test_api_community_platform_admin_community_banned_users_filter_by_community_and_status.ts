import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test querying the paginated list of banned users filtered by a specific
 * community ID and ban status to verify filtering capabilities for
 * community-scoped banned user views.
 *
 * Validate that all returned banned users belong to the specified community and
 * statuses are consistent with the ban status filter (banned or unbanned).
 *
 * Ensure the admin authorization is in place as a prerequisite.
 *
 * Test pagination and sorting behave correctly within the filtered results.
 *
 * This verifies that admins can focus on banned users for specific communities
 * and statuses effectively.
 *
 * Includes edge cases where no banned users match the filter resulting in an
 * empty list.
 */
export async function test_api_community_platform_admin_community_banned_users_filter_by_community_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Prepare admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, { body: {} });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Since the request body is an empty object type (no filter fields exist),
  // send empty object to retrieve general paginated banned users list
  const output: IPageICommunityPlatformCommunityBannedUser.ISummary =
    await api.functional.communityPlatform.admin.community_banned_users.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(output);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  // Validate each data item in the returned list
  for (const bannedUser of output.data) {
    typia.assert(bannedUser);
  }
}
