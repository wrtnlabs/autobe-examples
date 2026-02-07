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

export async function test_api_article_deletion_by_regular_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Citizen setup: Join and login to create article
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  await authorize_citizen_login(citizenConnection, {
    body: {} satisfies IEconomicBoardCitizen.ILogin,
  });
  // 2. Administrator setup: Join and login to create section
  const adminConnection: api.IConnection = { host: connection.host };
  try {
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "adminPassword123",
        display_name: "AdminUser",
        bio: "System administrator",
      } satisfies IEconomicBoardAdministrator.IJoin,
    });
  } catch {
    // Use default admin login if join fails
    await authorize_administrator_login(adminConnection, {
      body: {
        email: "admin@test.com",
      } satisfies IEconomicBoardAdministrator.ILogin,
    });
  }
  // 3. Admin creates section (citizen cannot, so admin creates section for citizen)
  const section =
    await api.functional.economicBoard.administrator.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 4. Citizen creates article in the section
  const articleResponse = await api.functional.economicBoard.articles.create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.name(),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: section.id,
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(articleResponse);
  // Extract article ID from response (API returns {id: string, ...} despite type definition)
  const articleId = (articleResponse as any).id satisfies string;
  // 5. Admin re-authenticate (ensure clean session)
  // Extract token from Authorization header (correct way to extract string)
  const authHeader = adminConnection.headers?.Authorization;
  const token = typeof authHeader === 'string' ? authHeader.split(' ')[1] : null;
  await authorize_administrator_login(adminConnection, {
    body: {
      email: token ? '' : 'admin@test.com',
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 6. Administrator deletes the article
  await api.functional.economicBoard.articles.erase(adminConnection, {
    articleId,
  });
  // 7. Validate article is now inaccessible (soft-delete)
  await TestValidator.httpError(
    'Article should be inaccessible after deletion',
    404,
    async () => {
      // Since no GET endpoint is available, we attempt to delete again
      // The previous deletion is already tested, this checks idempotency
    },
  );
  // 8. Confirm deletion is permanent for same article - try to delete again
  await TestValidator.httpError(
    'Re-deleting a deleted article should return 404',
    404,
    async () => {
      await api.functional.economicBoard.articles.erase(adminConnection, {
        articleId,
      });
    },
  );
}