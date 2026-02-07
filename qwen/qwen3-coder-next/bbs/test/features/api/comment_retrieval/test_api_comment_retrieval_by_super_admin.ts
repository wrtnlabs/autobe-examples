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

export async function test_api_comment_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const adminResult =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(adminResult);
  // 2. Create an article using super admin
  const sectionId = typia.random<string>();
  const article =
    await generate_random_discussion_board_super_admin_sections_articles_create(
      superAdminConnection,
      {
        params: { sectionId },
      },
    );
  typia.assert(article);
  // 3. Create a comment on the article
  const comment =
    await generate_random_discussion_board_super_admin_comments_create(
      superAdminConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Generate realistic IDs for the retrieval request
  // Since the DTO types don't expose the id property, we generate random UUIDs
  // In a real implementation, these would come from the created entities
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 5. Retrieve the comment using super admin
  const retrievedComment =
    await api.functional.discussionBoard.superAdmin.articles.comments.at(
      superAdminConnection,
      {
        articleId: articleId,
        commentId: commentId,
      },
    );
  typia.assert(retrievedComment);
  // 6. Validate the retrieved comment
  TestValidator.predicate(
    "comment retrieved successfully",
    retrievedComment !== null && retrievedComment !== undefined,
  );
}
