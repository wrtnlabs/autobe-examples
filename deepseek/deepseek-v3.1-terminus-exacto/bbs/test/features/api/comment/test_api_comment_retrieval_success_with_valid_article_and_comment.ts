import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test successful retrieval of an existing comment belonging to the specified article.
 */
export async function test_api_comment_retrieval_success_with_valid_article_and_comment(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for user
  const userConnection: api.IConnection = { host: connection.host };
  // Authorize user join and login
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create an article with random section ID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment under the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Retrieve the comment using the articles comments API
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(userConnection, {
      articleId: article.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);
  // Validate response structure
  TestValidator.equals("comment ID matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.predicate(
    "has creation timestamp",
    retrievedComment.created_at !== undefined,
  );
  TestValidator.predicate(
    "has update timestamp",
    retrievedComment.updated_at !== undefined,
  );
  TestValidator.predicate(
    "comment is not deleted",
    retrievedComment.deleted_at === null,
  );
  TestValidator.predicate(
    "has author information",
    retrievedComment.author !== undefined,
  );
  TestValidator.equals(
    "author ID matches",
    retrievedComment.author.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedComment.author.display_name,
    authorizedUser.display_name,
  );
  TestValidator.predicate(
    "has article context",
    retrievedComment.article !== undefined,
  );
  TestValidator.equals(
    "article ID matches",
    retrievedComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedComment.article.title,
    article.title,
  );
}
