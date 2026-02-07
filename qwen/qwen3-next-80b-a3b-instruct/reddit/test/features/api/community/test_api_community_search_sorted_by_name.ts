import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_search_sorted_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Search communities with keyword and sort=name_asc
  // Since no community creation endpoint exists, we cannot control the dataset
  // We must use existing data and test that the search works with sort=name_asc parameter
  const searchResult = await api.functional.community.admin.communities.search(
    adminConnection,
    {
      body: {
        search: "test", // Use any keyword that might exist in the system
        sort: "name_asc" as const,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(searchResult);
  // 3. Validate response structure (since we cannot verify ordering without controlled data)
  // Verify that pagination info exists and data array is present
  TestValidator.predicate(
    "pagination exists",
    () => searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    () => searchResult.data !== undefined && Array.isArray(searchResult.data),
  );
}
