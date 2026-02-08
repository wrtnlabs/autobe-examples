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

export async function test_api_admin_post_comments_sorted_retrieval_default_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Admin authorization setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput: ICommunityPlatformAdmin.IJoin = {};
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  const adminLoginInput: ICommunityPlatformAdmin.ILogin = {};
  await authorize_admin_login(adminConnection, { body: adminLoginInput });
  // User authorization setup
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinInput: ICommunityPlatformUser.IJoin = {};
  const userAuth = await authorize_user_join(userConnection, {
    body: userJoinInput,
  });
  typia.assert(userAuth);
  const userLoginInput: ICommunityPlatformUser.ILogin = {};
  await authorize_user_login(userConnection, { body: userLoginInput });
  // Create a post as user
  const randomPostCreateBody = typia.random<ICommunityPlatformPost.ICreate>();
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: randomPostCreateBody,
    },
  );
  // Cast post to object with at least 'id' property of string
  const postWithId: {
    id: string;
  } = post as {
    id: string;
  };
  typia.assert(postWithId);
  // Test case 1: Retrieve sorted comments with default 'best' sorting
  let body: ICommunityPlatformPostComment.IRequest = {
    sort: "best",
    page: 1,
    limit: 10,
  };
  const commentsPage =
    await api.functional.communityPlatform.admin.posts.comments.sorted.sortedComments(
      adminConnection,
      {
        postId: postWithId.id,
        body,
      },
    );
  typia.assert(commentsPage);
  // Confirm pagination metadata
  TestValidator.predicate(
    "pagination current page 1",
    commentsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit 10",
    commentsPage.pagination.limit === 10,
  );
  // Test case 2: Retrieve comments when post exists but no comments
  // For that, create a new post without comments
  const anotherPostCreateBody = typia.random<ICommunityPlatformPost.ICreate>();
  const anotherPost = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    { body: anotherPostCreateBody },
  );
  const anotherPostWithId: {
    id: string;
  } = anotherPost as {
    id: string;
  };
  typia.assert(anotherPostWithId);
  const emptyCommentsPage =
    await api.functional.communityPlatform.admin.posts.comments.sorted.sortedComments(
      adminConnection,
      {
        postId: anotherPostWithId.id,
        body: {
          sort: "best",
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(emptyCommentsPage);
  TestValidator.equals(
    "no comments data empty",
    emptyCommentsPage.data.length,
    0,
  );
  // Test case 3: Authorization enforcement for admin
  // Use a base connection (not adminConnection) expecting failure
  await TestValidator.error(
    "unauthorized access with base connection",
    async () => {
      await api.functional.communityPlatform.admin.posts.comments.sorted.sortedComments(
        connection,
        {
          postId: postWithId.id,
          body: {
            sort: "best",
            page: 1,
            limit: 5,
          },
        },
      );
    },
  );
}
