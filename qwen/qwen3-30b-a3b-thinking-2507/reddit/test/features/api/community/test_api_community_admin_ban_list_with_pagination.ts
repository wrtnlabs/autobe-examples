import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_admin_ban_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
    } satisfies ICommunityAdmin.IJoin,
  });
  // 2. Community ID (hardcoded for simplicity)
  const communityId = "b1c4d7c2-9a65-4f7b-9d6d-3b2f1a8e6d0c";
  // 3. Make API call with pagination params
  const results = await api.functional.community.admin.communities.bans.index(
    adminConnection,
    {
      communityId,
      body: {} satisfies ICommunityBannedUser.IRequest,
    },
  );
  typia.assert(results);
  // 4. Validate response
  TestValidator.equals(
    "pagination.current should be 2",
    results.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination.limit should be 5",
    results.pagination.limit,
    5,
  );
}
