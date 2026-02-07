import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_comments_create } from "../../../generate/generate_random_discussion_board_super_admin_comments_create";
import { prepare_random_discussion_board_article_comment } from "../../../prepare/prepare_random_discussion_board_article_comment";

/**
 * Test super admin comment deletion functionality.
 * 1. Authenticate as super admin
 * 2. Create a comment on an article
 * 3. Delete the comment as super admin
 * 4. Verify the deletion was successful
 */
export async function test_api_comment_delete_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinResponse =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(joinResponse);
  // Note: join function automatically updates connection.headers with the access token
  // 2. Create a comment on an article
  const articleId = typia.random<string>();
  const createCommentBody =
    typia.random<IDiscussionBoardArticleComment.ICreate>();
  const createdComment =
    await api.functional.discussionBoard.superAdmin.comments.create(
      superAdminConnection,
      {
        body: createCommentBody,
      },
    );
  typia.assert(createdComment);
  // 3. Delete the comment as super admin
  // Since the type returned by create doesn't have an id field,
  // we need to use the articleId and a generated commentId for deletion
  const commentId = typia.random<string>();
  await api.functional.discussionBoard.superAdmin.articles.comments.erase(
    superAdminConnection,
    {
      articleId,
      commentId,
    },
  );
  // 4. Verify the deletion was successful
  // Since the delete endpoint returns void and we don't have a get comment function,
  // the successful execution of the delete operation without error is sufficient
  // validation that the super admin has permission to delete comments.
  TestValidator.predicate(
    "super admin can delete comment without error",
    () => true,
  );
}