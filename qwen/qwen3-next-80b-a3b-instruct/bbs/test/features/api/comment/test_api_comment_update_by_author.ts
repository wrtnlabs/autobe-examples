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
import { prepare_random_discussion_board_user } from "../../../prepare/prepare_random_discussion_board_user";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_comment } from "../../../prepare/prepare_random_discussion_board_article_comment";
import { generate_random_discussion_board_users_create } from "../../../generate/generate_random_discussion_board_users_create";
import { generate_random_discussion_board_citizen_articles_create } from "../../../generate/generate_random_discussion_board_citizen_articles_create";
import { generate_random_discussion_board_citizen_articles_comments_create } from "../../../generate/generate_random_discussion_board_citizen_articles_comments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate a citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenAuth: IDiscussionBoardUser.IAuthorized =
    await authorize_member_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardUser.IJoin,
    });
  typia.assert(citizenAuth);
  // Step 2: Create a new article
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  // Step 3: Create a comment on the article
  const originalComment: IDiscussionBoardArticleComment =
    await generate_random_discussion_board_citizen_articles_comments_create(
      citizenConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardArticleComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(originalComment);
  // Step 4: Create new comment content
  const newContent = RandomGenerator.paragraph({ sentences: 5 });
  // Step 5: Update the comment content using the original citizen connection
  const updatedComment: IDiscussionBoardArticleComment =
    await api.functional.discussionBoard.citizen.articles.comments.update(
      citizenConnection,
      {
        articleId: article.id,
        commentId: originalComment.id,
        body: {
          content: newContent,
        } satisfies IDiscussionBoardArticleComment.IUpdate,
      },
    );
  // Step 6: Validate the updated comment
  typia.assert(updatedComment);
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    newContent,
  );
  TestValidator.equals(
    "comment ID preserved",
    updatedComment.id,
    originalComment.id,
  );
  TestValidator.predicate(
    "updated_at timestamp modified",
    updatedComment.updated_at > originalComment.updated_at,
  );
  TestValidator.equals(
    "author unchanged",
    updatedComment.author.id,
    originalComment.author.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.created_at,
    originalComment.created_at,
  );
  TestValidator.equals(
    "status unchanged",
    updatedComment.status,
    originalComment.status,
  );
}
