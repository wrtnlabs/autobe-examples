import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_comments_index_successful_retrieval_with_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join and authenticate
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(authorizedUser);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Create a post by the authenticated user
  const postBody: ICommunityPlatformPost.ICreate =
    typia.random<ICommunityPlatformPost.ICreate>();
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    { body: postBody },
  );
  typia.assert(post);
  // 3. Define comment index request body with pagination and sorting
  const commentIndexBody: ICommunityPlatformPostComment.IRequest = {
    page: 1,
    limit: 10,
    sort: "new",
    parent_id: null,
    search: null,
  } satisfies ICommunityPlatformPostComment.IRequest;
  // 4. Retrieve paginated comments for the post
  const postId = (post as any).id ?? (post as any).post_id;
  const commentsPage =
    await api.functional.communityPlatform.user.posts.comments.index(
      userConnection,
      {
        postId: postId,
        body: commentIndexBody,
      },
    );
  typia.assert(commentsPage);
  // 5. Check pagination correctness using TestValidator
  const pagination = commentsPage.pagination;
  TestValidator.predicate(
    "Pagination current page is positive",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "Pagination limit is within bounds",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "Pagination records are non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pagination pages are consistent",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Pagination data count equals or less than limit",
    commentsPage.data.length <= pagination.limit,
  );
  // 6. Check that all comments are non-deleted and valid
  commentsPage.data.forEach((comment) => {
    const c = typia.assert(comment) as ICommunityPlatformPostComment.ISummary;
    if ("deleted_at" in c) {
      TestValidator.equals("Comment deleted_at is null", c.deleted_at, null);
    }
    if ("child_comments" in c && Array.isArray(c.child_comments)) {
      c.child_comments.forEach((child) => {
        const cc = typia.assert(
          child,
        ) as ICommunityPlatformPostComment.ISummary;
        if ("deleted_at" in cc) {
          TestValidator.equals(
            "Child comment deleted_at is null",
            cc.deleted_at,
            null,
          );
        }
      });
    }
  });
  // 7. (Optional) Validate sorting order if multiple comments are present
  if (commentsPage.data.length > 1) {
    for (let i = 1; i < commentsPage.data.length; i++) {
      const prev = typia.assert(
        commentsPage.data[i - 1],
      ) as ICommunityPlatformPostComment.ISummary;
      const curr = typia.assert(
        commentsPage.data[i],
      ) as ICommunityPlatformPostComment.ISummary;
      if ("created_at" in prev && "created_at" in curr) {
        const prevCreatedAt = prev.created_at;
        const currCreatedAt = curr.created_at;
        // Ensure created_at are string or number before using in Date constructor
        if (
          (typeof prevCreatedAt === "string" ||
            typeof prevCreatedAt === "number") &&
          (typeof currCreatedAt === "string" ||
            typeof currCreatedAt === "number")
        ) {
          TestValidator.predicate(
            `Comments are sorted by new descending at index ${i}`,
            new Date(prevCreatedAt).getTime() >=
              new Date(currCreatedAt).getTime(),
          );
        }
      }
    }
  }
}
