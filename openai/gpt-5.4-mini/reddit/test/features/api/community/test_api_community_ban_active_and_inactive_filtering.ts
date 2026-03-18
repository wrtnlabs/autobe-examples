import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_ban_active_and_inactive_filtering(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const limit = 10;
  const activePage =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          isActive: true,
          sort: "new",
          page: 1,
          limit,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(activePage);
  TestValidator.equals(
    "active pagination current matches request page",
    activePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "active pagination limit matches request limit",
    activePage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "active pagination records is non-negative",
    activePage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "active pagination pages is non-negative",
    activePage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "active data length does not exceed limit",
    activePage.data.length <= limit,
  );
  const inactivePage =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          isActive: false,
          sort: "old",
          page: 1,
          limit,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(inactivePage);
  TestValidator.equals(
    "inactive pagination current matches request page",
    inactivePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "inactive pagination limit matches request limit",
    inactivePage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "inactive pagination records is non-negative",
    inactivePage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "inactive pagination pages is non-negative",
    inactivePage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "inactive data length does not exceed limit",
    inactivePage.data.length <= limit,
  );
}
