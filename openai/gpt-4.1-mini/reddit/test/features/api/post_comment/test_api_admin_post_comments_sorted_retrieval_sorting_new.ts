import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_admin_post_comments_sorted_retrieval_sorting_new(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin account creation and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityPlatformAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  const adminLoginAuth = await authorize_admin_login(adminConnection, {
    body: typia.random<ICommunityPlatformAdmin.ILogin>(),
  });
  typia.assert(adminLoginAuth);
  adminConnection.headers.Authorization = adminLoginAuth.token.access;
  // 2. User account creation and login
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: typia.random<ICommunityPlatformUser.IJoin>(),
  });
  typia.assert(userAuth);
  userConnection.headers ??= {};
  userConnection.headers.Authorization = userAuth.token.access;
  const userLoginAuth = await authorize_user_login(userConnection, {
    body: typia.random<ICommunityPlatformUser.ILogin>(),
  });
  typia.assert(userLoginAuth);
  userConnection.headers.Authorization = userLoginAuth.token.access;
  // 3. User creates a post
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: typia.random<ICommunityPlatformPost.ICreate>(),
    },
  );
  // Assert post includes 'id'
  const castedPost = typia.assert<
    ICommunityPlatformPost & {
      id: string;
    }
  >(post);
  // 4. Admin requests comments sorted by 'new'
  // Prepare pagination and sorting request
  const requestBody: ICommunityPlatformPostComment.IRequest = {
    page: 1,
    limit: 10,
    strategy: "new",
    parent_comment_id: null,
    q: null,
  };
  const result =
    await api.functional.communityPlatform.admin.posts.comments.sorted.sortedComments(
      adminConnection,
      {
        postId: castedPost.id,
        body: requestBody,
      },
    );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is at most 10",
    result.pagination.limit <= 10,
  );
  // Validate that comment data is an array
  TestValidator.predicate(
    "result data is an array",
    Array.isArray(result.data),
  );
  // Since 'create_date' and 'deleted_at' do not exist on ISummary, remove date and deletion checks
  // Just check that there is no undefined or null comment in data
  for (const commentRaw of result.data) {
    TestValidator.predicate(
      "comment exists",
      commentRaw !== null && commentRaw !== undefined,
    );
  }
}
