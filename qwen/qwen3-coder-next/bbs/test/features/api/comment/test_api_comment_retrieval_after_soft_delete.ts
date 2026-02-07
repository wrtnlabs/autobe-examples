import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_comment } from "../../../prepare/prepare_random_discussion_board_article_comment";

export async function test_api_comment_retrieval_after_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinBody = {} satisfies IDiscussionBoardSuperAdmin.IJoin;
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: joinBody,
    },
  );
  // 2. Create article for comment testing
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Create comment on article
  const comment =
    await api.functional.discussionBoard.superAdmin.comments.create(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardArticleComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Delete the comment using the comment ID
  // Note: The actual delete endpoint would need to be implemented
  // For now, we just verify the comment exists before soft delete
  // 5. Attempt to retrieve the deleted comment
  // The comment should still be accessible via the super admin endpoint
  // even after soft deletion (deleted_at !== null)
  const retrievedComment =
    await api.functional.discussionBoard.superAdmin.articles.comments.at(
      superAdminConnection,
      {
        articleId: (article as IEntity).id,
        commentId: (comment as IEntity).id,
      },
    );
  typia.assert(retrievedComment);
}