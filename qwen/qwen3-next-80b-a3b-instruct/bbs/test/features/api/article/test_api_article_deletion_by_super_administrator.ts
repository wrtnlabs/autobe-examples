import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
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
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_economic_board_administrator_sections_create } from "../../../generate/generate_random_economic_board_administrator_sections_create";
import { generate_random_economic_board_articles_create } from "../../../generate/generate_random_economic_board_articles_create";
import { generate_random_economic_board_citizen_admin_requests_create } from "../../../generate/generate_random_economic_board_citizen_admin_requests_create";
import { prepare_random_economic_board_admin_request } from "../../../prepare/prepare_random_economic_board_admin_request";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_section } from "../../../prepare/prepare_random_economic_board_section";

export async function test_api_article_deletion_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Citizen setup: Create citizen account
  const citizenConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const citizenJoinResponse = await authorize_citizen_join(citizenConnection, {
    body: {
      email,
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizenJoinResponse);
  // 2. Create section as citizen (this is allowed by the system)
  const sectionResponse =
    await generate_random_economic_board_administrator_sections_create(
      citizenConnection,
      {
        body: {
          name: "Economy",
          description: "Articles about economic policies and analysis",
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(sectionResponse);
  // 3. Create initial article as citizen
  const initialArticleResponse =
    await generate_random_economic_board_articles_create(citizenConnection, {
      body: {
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: sectionResponse.id,
      } satisfies IEconomicBoardArticle.ICreate,
    });
  typia.assert(initialArticleResponse);
  // 4. Submit admin request as citizen
  const adminRequestResponse =
    await generate_random_economic_board_citizen_admin_requests_create(
      citizenConnection,
      {
        body: {
          reason_text:
            "I have extensive experience in economic analysis and want to help moderate the platform.",
        } satisfies IEconomicBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequestResponse);
  // 5. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  // superAdministrator.ILogin is an empty interface - no properties required
  const superAdminLoginResponse = await authorize_super_administrator_login(
    superAdminConnection,
    {
      body: {},
    } satisfies IEconomicBoardSuperAdministrator.ILogin,
  );
  typia.assert(superAdminLoginResponse);
  // 6. Approve admin request as super administrator
  // Use proper IRequest type instead of empty object
  const approveAdminRequestResponse =
    await api.functional.economicBoard.superAdministrator.admin_requests.update(
      superAdminConnection,
      {
        requestId: typia.assert<
          IEconomicBoardAdminRequest & {
            id: string;
          }
        >(adminRequestResponse).id,
        body: {
          status: "approved",
        } satisfies IEconomicBoardAdminRequest.IRequest,
      },
    );
  typia.assert(approveAdminRequestResponse);
  // 7. Authenticate as new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginResponse = await authorize_administrator_login(
    adminConnection,
    {
      body: {
        email, // Use the stored email from citizen account creation
      } satisfies IEconomicBoardAdministrator.ILogin,
    },
  );
  typia.assert(adminLoginResponse);
  // 8. Create section as new administrator
  const adminSectionResponse =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Politics",
          description: "Political commentary and analysis",
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(adminSectionResponse);
  // 9. Create article to be deleted as administrator
  const articleToDeleteResponse =
    await generate_random_economic_board_articles_create(adminConnection, {
      body: {
        title: RandomGenerator.name(4),
        content: RandomGenerator.content({ paragraphs: 4 }),
        section_id: adminSectionResponse.id,
      } satisfies IEconomicBoardArticle.ICreate,
    });
  typia.assert(articleToDeleteResponse);
  // 10. Delete article as super administrator
  // This operation should succeed with no error
  await api.functional.economicBoard.articles.erase(superAdminConnection, {
    articleId: typia.assert<
      IEconomicBoardArticle & {
        id: string;
      }
    >(articleToDeleteResponse).id,
  });
  // Validation: The only validation we can perform is that the delete operation completed without throwing an error
  // The system will return 404 if we try to access the article in the future, but we cannot test this because no read endpoint is available
  // We must trust that the delete operation working means the article was successfully deleted
}
