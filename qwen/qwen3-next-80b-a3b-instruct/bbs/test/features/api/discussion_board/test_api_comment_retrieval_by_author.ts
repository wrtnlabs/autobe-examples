import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_comment } from "../../../prepare/prepare_random_discussion_board_article_comment";
import { generate_random_discussion_board_citizen_articles_create } from "../../../generate/generate_random_discussion_board_citizen_articles_create";
import { generate_random_discussion_board_citizen_articles_comments_create } from "../../../generate/generate_random_discussion_board_citizen_articles_comments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_retrieval_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen connection for authentication
  const citizenConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate citizen user
  const citizen: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    citizenConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(citizen);
  // Step 2: Create an article as the authenticated citizen
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Create a comment on the article
  const comment: IDiscussionBoardArticleComment =
    await generate_random_discussion_board_citizen_articles_comments_create(
      citizenConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardArticleComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 4: Retrieve the specific comment by articleId and commentId
  const retrievedComment: IDiscussionBoardArticleComment =
    await api.functional.discussionBoard.articles.comments.at(
      citizenConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);
  // Step 5: Validate retrieved comment matches original comment
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment created_at matches",
    retrievedComment.created_at,
    comment.created_at,
  );
  TestValidator.equals(
    "comment updated_at matches",
    retrievedComment.updated_at,
    comment.updated_at,
  );
  TestValidator.equals(
    "comment status is active",
    retrievedComment.status,
    "active",
  );
  TestValidator.equals(
    "comment author id matches",
    retrievedComment.author.id,
    citizen.id,
  );
  TestValidator.equals(
    "comment author username matches",
    retrievedComment.author.username,
    citizen.displayName,
  );
  TestValidator.equals(
    "comment author account status is active",
    retrievedComment.author.account_status,
    "active",
  );
}
