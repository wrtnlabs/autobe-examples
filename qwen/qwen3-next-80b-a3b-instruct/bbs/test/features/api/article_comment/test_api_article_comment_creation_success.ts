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

export async function test_api_article_comment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user via utility
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IEconomicBoardCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IEconomicBoardCitizen.IJoin,
    });
  typia.assert(citizen);
  // 2. Create article to comment on via utility
  const article: IEconomicBoardArticle =
    await generate_random_economic_board_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEconomicBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Prepare comment with valid content (5-1000 chars)
  const commentContent: string & tags.MinLength<5> & tags.MaxLength<1000> =
    RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 });
  // 4. Create comment via utility with articleId and body
  const createdComment: IEconomicBoardComment =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: commentContent,
        } satisfies IEconomicBoardComment.ICreate,
      },
    );
  typia.assert(createdComment);
  // 5. Validate created comment properties
  TestValidator.equals(
    "comment content matches",
    createdComment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment article_id matches",
    createdComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "comment author id matches",
    createdComment.author.id,
    citizen.id,
  );
  TestValidator.equals(
    "comment author display name matches",
    createdComment.author.display_name,
    citizen.display_name,
  );
  TestValidator.predicate("comment created_at is valid date-time", () => {
    return !isNaN(new Date(createdComment.created_at).getTime());
  });
  TestValidator.predicate("comment updated_at is valid date-time", () => {
    return !isNaN(new Date(createdComment.updated_at).getTime());
  });
  TestValidator.equals(
    "comment deleted_at is null",
    createdComment.deleted_at,
    null,
  );
}