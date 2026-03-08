import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";

export async function test_api_article_retrieval_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create an article with complete data using utility function
  const article =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
          tagIds: ArrayUtil.repeat(2, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
        },
      },
    );
  typia.assert(article);
  // 3. Retrieve the article by ID using member connection with token
  const retrievedArticle =
    await api.functional.economicPoliticalBoard.member.articles.at(
      memberConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(retrievedArticle);
  // 4. Validate all required fields are present and correct
  TestValidator.equals("article ID matches", retrievedArticle.id, article.id);
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
    "author ID matches",
    retrievedArticle.author.userId,
    article.author.userId,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedArticle.author.user.displayName,
    article.author.user.displayName,
  );
  TestValidator.equals(
    "section ID matches",
    retrievedArticle.section.id,
    article.section.id,
  );
  TestValidator.equals(
    "section name matches",
    retrievedArticle.section.name,
    article.section.name,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedArticle.created_at,
    article.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedArticle.updated_at,
    article.updated_at,
  );
  TestValidator.equals(
    "deleted_at is NULL (active article)",
    retrievedArticle.deleted_at,
    null,
  );
  TestValidator.equals(
    "attachments array length matches",
    retrievedArticle.attachments.length,
    article.attachments.length,
  );
  TestValidator.equals(
    "tags array length matches",
    retrievedArticle.tags.length,
    article.tags.length,
  );
  TestValidator.predicate(
    "tags contain tag names",
    retrievedArticle.tags.every((tag) => tag.name.length > 0),
  );
}
