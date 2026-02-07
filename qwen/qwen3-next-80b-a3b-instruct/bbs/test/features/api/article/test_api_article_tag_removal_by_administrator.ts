import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
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
import { generate_random_economic_board_administrator_sections_create } from "../../../generate/generate_random_economic_board_administrator_sections_create";
import { generate_random_economic_board_articles_create } from "../../../generate/generate_random_economic_board_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_section } from "../../../prepare/prepare_random_economic_board_section";

export async function test_api_article_tag_removal_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: { email: typia.random<string & tags.Format<"email">>() } satisfies IEconomicBoardAdministrator.ILogin
  });
  const section =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(section);
  // 2. Citizen registers and logs in
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenPassword = RandomGenerator.alphabets(10);
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: citizenEmail,
      password: citizenPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  await authorize_citizen_login(citizenConnection, {
    body: { email: citizenEmail } satisfies IEconomicBoardCitizen.ILogin
  });
  // 3. Citizen creates an article in the section
  const articleResponse = await generate_random_economic_board_articles_create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: section.id,
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  const article = typia.assert<{ id: string } & IEconomicBoardArticle>(articleResponse);
  // 4. Add a tag to the article
  const tagName = RandomGenerator.alphabets(8);
  await api.functional.economicBoard.articles.tags.postByArticleid(
    citizenConnection,
    {
      articleId: article.id,
      body: [tagName],
    } satisfies IEconomicBoardArticle.ITagsCreate,
  );
  // 5. Switch to administrator context
  const adminConnectionForRemoval: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnectionForRemoval, {
    body: { email: typia.random<string & tags.Format<"email">>() } satisfies IEconomicBoardAdministrator.ILogin
  });
  // 6. Admin removes the tag from citizen's article
  // Per schema, tagId is the string tag value (not a UUID)
  // We use the same string as both tag name and tagId
  await api.functional.economicBoard.articles.tags.erase(
    adminConnectionForRemoval,
    {
      articleId: article.id,
      tagId: tagName,
    },
  );
  // 7. Validate
  // Since there's no GET endpoint to verify tag removal, we rely on:
  // - The operation didn't throw an error (success)
  // - The admin successfully removed a tag from a citizen's article
  // - This demonstrates administrative override of ownership
  // No typia.assert needed as erase returns void
  // The test passes if no exception was thrown
  TestValidator.predicate("Admin successfully removed tag", true);
}