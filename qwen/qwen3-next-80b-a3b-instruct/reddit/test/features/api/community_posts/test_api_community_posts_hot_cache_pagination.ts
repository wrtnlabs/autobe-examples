import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_posts_hot_cache_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. First call to get hot feed
  const firstCall = await api.functional.community.admin.posts.hot.index(
    adminConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(firstCall);
  // 3. Second call to get hot feed (same endpoint, no parameters)
  const secondCall = await api.functional.community.admin.posts.hot.index(
    adminConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(secondCall);
  // 4. Validate caching behavior: same data returned twice
  TestValidator.equals(
    "first and second calls return same data",
    firstCall.data,
    secondCall.data,
  );
  TestValidator.equals(
    "first and second calls have same pagination",
    firstCall.pagination,
    secondCall.pagination,
  );
  TestValidator.predicate("data contains items", firstCall.data.length > 0);
  TestValidator.predicate(
    "pagination is valid",
    firstCall.pagination.current >= 1 && firstCall.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is positive",
    firstCall.pagination.records > 0,
  );
  TestValidator.predicate("pages is positive", firstCall.pagination.pages >= 1);
}
