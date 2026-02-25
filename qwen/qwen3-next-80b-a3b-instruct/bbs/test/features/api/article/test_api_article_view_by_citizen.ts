import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
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
import { generate_random_economic_board_citizen_articles_create } from "../../../generate/generate_random_economic_board_citizen_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";

export async function test_api_article_view_by_citizen(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as citizen to create article
  const citizenConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(authorized);
  // Create article - section_id will be validated by server when it exists
  // Use random UUID as section_id since no sections endpoint exists for citizens
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article = await generate_random_economic_board_citizen_articles_create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 15,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 15,
        }),
        section_id: sectionId,
        tags: [RandomGenerator.alphabets(8)],
        attachment_ids: [],
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Retrieve the article - the only endpoint we can test
  const retrievedArticle =
    await api.functional.economicBoard.citizen.articles.at(citizenConnection, {
      articleId: article.id,
    });
  typia.assert(retrievedArticle);
  // Validate basic fields - validating only what's accessible
  TestValidator.equals("article id matches", retrievedArticle.id, article.id);
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content matches",
    retrievedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "article author id matches",
    retrievedArticle.author.id,
    authorized.id,
  );
  TestValidator.equals(
    "article author email matches",
    retrievedArticle.author.email,
    authorized.email,
  );
  TestValidator.equals(
    "article author display_name matches",
    retrievedArticle.author.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "article author created_at matches",
    retrievedArticle.author.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "article is_deleted is false",
    retrievedArticle.is_deleted,
    false,
  );
  // Validate tags if they exist
  TestValidator.equals(
    "article tags count matches",
    retrievedArticle.tags?.length,
    article.tags?.length,
  );
  if (article.tags && retrievedArticle.tags) {
    TestValidator.equals(
      "article tag matches",
      retrievedArticle.tags[0],
      article.tags[0],
    );
  }
  // Validate attachments (expected 0)
  TestValidator.equals(
    "article attachments count matches",
    retrievedArticle.attachments.length,
    0,
  );
  // Validate comments count
  TestValidator.equals(
    "article comments_count matches",
    retrievedArticle.comments_count,
    0,
  );
}
