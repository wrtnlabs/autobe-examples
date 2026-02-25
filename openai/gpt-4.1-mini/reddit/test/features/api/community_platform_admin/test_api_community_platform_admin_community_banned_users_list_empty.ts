import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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

export async function test_api_community_platform_admin_community_banned_users_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Admin requests banned users list for a community that has no banned users.
  // Validates correct handling of empty datasets with an empty data array, valid pagination metadata indicating zero records, and no errors.
  // Confirms HTTP 200 response with empty results for graceful handling of edge case.
  // 1. Admin account join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${Date.now()}@example.com`,
      password: "StrongPassword123!",
      displayName: "Test Admin",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminAuthorized);
  // Updated adminConnection with authorization headers for subsequent requests
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // 2. Use a random UUID for communityId - it's assumed no banned users exist
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare empty filter request body with default pagination (page=1, limit=10) for the banned users endpoint
  const requestBody: ICommunityPlatformCommunityBannedUser.IRequest = {
    page: 1,
    limit: 10,
    banStatus: undefined,
    bannedAt: null,
    unbannedAt: null,
    search: undefined,
  };
  // 4. Call the banned users list endpoint (PATCH) for the community with empty banned users
  const response =
    await api.functional.communityPlatform.admin.communities.banned_users.index(
      adminConnection,
      {
        communityId,
        body: requestBody,
      },
    );
  typia.assert(response);
  // 5. Validate empty data array
  TestValidator.equals(
    "data array length should be zero",
    response.data.length,
    0,
  );
  // 6. Validate pagination metadata indicating zero records
  const pagination = response.pagination;
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals("pagination records should be 0", pagination.records, 0);
  TestValidator.equals("pagination pages should be 0", pagination.pages, 0);
  TestValidator.predicate(
    "pagination limit should be positive",
    pagination.limit > 0,
  );
  // 7. Confirm no errors and successful edge case handling
  TestValidator.predicate(
    "response data is an empty array",
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "response properly handles empty banned users list",
    response.data.length === 0,
  );
}
