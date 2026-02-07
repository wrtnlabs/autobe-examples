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

export async function test_api_community_posts_hot_first_page(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin account
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // Call hot feed endpoint with empty request body to get first page
  const hotPosts = await api.functional.community.admin.posts.hot.index(
    adminConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(hotPosts);
  // Validate exactly 20 post summaries are returned
  TestValidator.equals("post count", hotPosts.data.length, 20);
  // Validate pagination metadata
  TestValidator.equals("current page", hotPosts.pagination.current, 1);
  TestValidator.equals("pagination limit", hotPosts.pagination.limit, 20);
  TestValidator.predicate("has records count", hotPosts.pagination.records > 0);
  TestValidator.predicate("has pages count", hotPosts.pagination.pages >= 1);
}
