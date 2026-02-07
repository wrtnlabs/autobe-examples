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

export async function test_api_comment_update_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // Step 2: Create a test article
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      adminConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // Step 3: Create a comment on the article
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Update the comment as super administrator
  const updatedContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedComment =
    await api.functional.discussionBoard.superAdmin.articles.comments.update(
      adminConnection,
      {
        articleId: articleId,
        commentId: commentId,
        body: {
          content: updatedContent,
        } satisfies IDiscussionBoardArticleComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
}
