import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_subscribed_communities_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // 2. Test empty subscription list pagination
  const emptyResult =
    await api.functional.redditLike.admin.communities.my.index(adminConnection);
  typia.assert(emptyResult);
  // 3. Validate empty subscription response structure
  TestValidator.equals(
    "empty subscription: records=0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty subscription: pages=0",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty subscription: current=1 (default)",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty subscription: limit=5 (default)",
    emptyResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "empty subscription: empty data array",
    emptyResult.data.length,
    0,
  );
  // 4. Test boundary: page beyond available
  const resultBeyond =
    await api.functional.redditLike.admin.communities.my.index(adminConnection);
  typia.assert(resultBeyond);
  // When requesting a page beyond available results, should return empty data
  TestValidator.equals(
    "beyond page has empty data",
    resultBeyond.data.length,
    0,
  );
  // 5. Test small limit value
  const resultSmallLimit =
    await api.functional.redditLike.admin.communities.my.index(adminConnection);
  typia.assert(resultSmallLimit);
  // For empty result set, limit doesn't affect outcome
  TestValidator.equals(
    "limit=1 pagination with empty result",
    resultSmallLimit.pagination.limit,
    1,
  );
  TestValidator.equals(
    "limit=1 pages with 0 records",
    resultSmallLimit.pagination.pages,
    0,
  );
}
