import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_discussion_administrator_sections_create } from "../../../generate/generate_random_economic_discussion_administrator_sections_create";
import { generate_random_economic_discussion_citizen_articles_create } from "../../../generate/generate_random_economic_discussion_citizen_articles_create";
import { prepare_random_economic_discussion_article } from "../../../prepare/prepare_random_economic_discussion_article";
import { prepare_random_economic_discussion_section } from "../../../prepare/prepare_random_economic_discussion_section";

export async function test_api_article_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account for section creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicDiscussionAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IEconomicDiscussionAdministrator.IJoin,
    });
  // Step 2: Create section for article posting
  const section: IEconomicDiscussionSection =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {},
    );
  // Step 3: Create first citizen account to create the article
  const firstCitizenConnection: api.IConnection = { host: connection.host };
  const firstCitizen: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(firstCitizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IEconomicDiscussionCitizen.IJoin,
    });
  // Step 4: Create second citizen account to attempt deletion
  const secondCitizenConnection: api.IConnection = { host: connection.host };
  const secondCitizen: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(secondCitizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IEconomicDiscussionCitizen.IJoin,
    });
  // Step 5: Create article with first citizen
  const article: IEconomicDiscussionArticle =
    await generate_random_economic_discussion_citizen_articles_create(
      firstCitizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: section.id,
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 6: Attempt unauthorized deletion with second citizen
  // Using secondCitizenConnection for deletion attempt
  await TestValidator.error(
    "second citizen should not be allowed to delete article created by first citizen",
    async () => {
      await api.functional.economicDiscussion.citizen.articles.erase(
        secondCitizenConnection,
        {
          articleId: article.id,
        },
      );
    },
  );
}
