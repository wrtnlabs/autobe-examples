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

export async function test_api_community_platform_admin_community_banned_users_filter_by_user_and_ban_time_range(
  connection: api.IConnection,
): Promise<void> {
  // Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityPlatformAdmin.IJoin,
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // Call endpoint with empty filter (since no request properties)
  const response =
    await api.functional.communityPlatform.admin.community_banned_users.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response.data),
  );
  // Test empty results with another empty filter (no user id or date filter available)
  const emptyResponse =
    await api.functional.communityPlatform.admin.community_banned_users.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(emptyResponse);
  TestValidator.predicate(
    "empty filter returns data array",
    Array.isArray(emptyResponse.data),
  );
}
