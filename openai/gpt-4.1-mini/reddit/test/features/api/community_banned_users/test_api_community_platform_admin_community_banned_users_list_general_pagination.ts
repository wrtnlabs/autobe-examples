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

export async function test_api_community_platform_admin_community_banned_users_list_general_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and obtains an authorized admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Query banned users list without filters (general pagination)
  const response =
    await api.functional.communityPlatform.admin.community_banned_users.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Validate pagination metadata properties
  const { pagination, data } = response;
  TestValidator.predicate("pagination current >= 1", pagination.current >= 1);
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // 4. Validate data is array
  TestValidator.predicate("data is array", Array.isArray(data));
  // 5. Since ICommunityPlatformCommunityBannedUser.ISummary has no properties defined,
  //    no detailed per-item property checks are possible or permitted by DTO.
  //    We only assert each item is an object.
  for (const bannedUser of data) {
    TestValidator.predicate(
      "bannedUser is object",
      typeof bannedUser === "object" && bannedUser !== null,
    );
  }
}
