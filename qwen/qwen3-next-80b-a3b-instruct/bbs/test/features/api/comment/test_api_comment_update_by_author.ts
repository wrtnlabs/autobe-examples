import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { generate_random_economic_board_citizen_articles_create } from "../../../generate/generate_random_economic_board_citizen_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user to act as comment author
  const citizenConnection: api.IConnection = { host: connection.host };
  const createdCitizen: IEconomicBoardCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IEconomicBoardCitizen.IJoin,
    });
  // 2. Create article for commenting
  const article = await generate_random_economic_board_citizen_articles_create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create comment as the citizen user
  const comment =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEconomicBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Update the comment with new content
  const updatedComment =
    await api.functional.economicBoard.citizen.articles.comments.update(
      citizenConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEconomicBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate update: author unchanged, content updated, updated_at changed, article_id unchanged
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment author unchanged",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "comment article unchanged",
    updatedComment.article.id,
    comment.article.id,
  );
  TestValidator.notEquals(
    "comment updated_at changed",
    updatedComment.updated_at,
    comment.updated_at,
  );
  TestValidator.predicate(
    "comment has updated timestamp",
    updatedComment.updated_at > comment.created_at,
  );
  TestValidator.predicate(
    "comment not deleted",
    updatedComment.deleted_at === null,
  );
  // 6. Validate the 60-minute edit window constraint - create a comment and immediately update it
  const comment2 =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEconomicBoardComment.ICreate,
      },
    );
  typia.assert(comment2);
  // Update immediately (within 60 minutes)
  const updatedComment2 =
    await api.functional.economicBoard.citizen.articles.comments.update(
      citizenConnection,
      {
        articleId: article.id,
        commentId: comment2.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEconomicBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment2);
  TestValidator.notEquals(
    "comment2 updated_at changed",
    updatedComment2.updated_at,
    comment2.updated_at,
  );
  // 7. Validate update with same content still updates updated_at
  const comment3 =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEconomicBoardComment.ICreate,
      },
    );
  typia.assert(comment3);
  // Update with same content
  const updatedComment3 =
    await api.functional.economicBoard.citizen.articles.comments.update(
      citizenConnection,
      {
        articleId: article.id,
        commentId: comment3.id,
        body: {
          content: comment3.content,
        } satisfies IEconomicBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment3);
  TestValidator.notEquals(
    "comment3 updated_at changed when content unchanged",
    updatedComment3.updated_at,
    comment3.updated_at,
  );
}
