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
export async function test_api_comment_retrieval_by_non_author(
  connection: api.IConnection,
): Promise<void> {
  // Create first citizen connection and authenticate
  const citizenAConnection: api.IConnection = { host: connection.host };
  const citizenA: IDiscussionBoardUser.IAuthorized =
    await authorize_member_join(citizenAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardUser.IJoin,
    });
  typia.assert(citizenA);
  // Create second citizen connection and authenticate
  const citizenBConnection: api.IConnection = { host: connection.host };
  const citizenB: IDiscussionBoardUser.IAuthorized =
    await authorize_member_join(citizenBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardUser.IJoin,
    });
  typia.assert(citizenB);
  // Citizen A creates an article
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      citizenAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Citizen A posts a comment on the article
  const comment: IDiscussionBoardArticleComment =
    await generate_random_discussion_board_citizen_articles_comments_create(
      citizenAConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardArticleComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Citizen B retrieves the comment (non-author accessing the comment)
  const retrievedComment: IDiscussionBoardArticleComment =
    await api.functional.discussionBoard.articles.comments.at(
      citizenBConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);
  // Successfully retrieved comment by a non-author citizen, validating that public comments are accessible to any authenticated user
}
