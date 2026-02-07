import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import type { IEconomicBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardProfile";
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
import { generate_random_economic_board_administrator_bans_create } from "../../../generate/generate_random_economic_board_administrator_bans_create";
import { generate_random_economic_board_articles_create } from "../../../generate/generate_random_economic_board_articles_create";
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { generate_random_economic_board_super_administrator_sections_create } from "../../../generate/generate_random_economic_board_super_administrator_sections_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_ban } from "../../../prepare/prepare_random_economic_board_ban";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";
import { prepare_random_economic_board_section } from "../../../prepare/prepare_random_economic_board_section";

export async function test_api_superadministrator_metrics_with_real_system_changes(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdministrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IEconomicBoardSuperAdministrator.ILogin,
  });
  // Create a new citizen account (increments totalUsers)
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenJoinResult = await authorize_citizen_join(citizenConnection, {
    body: {
      email: citizenEmail,
      password: "securePassword123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizenJoinResult);
  // Create a new section (increments sectionCreations24h)
  const section =
    await generate_random_economic_board_super_administrator_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create an article (to be deleted later)
  const article = await generate_random_economic_board_articles_create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  const articleWithId = typia.assert<IEconomicBoardArticle & { id: string }>(article);
  // Post a comment on the article (increments totalComments)
  const comment =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenConnection,
      {
        params: { articleId: articleWithId.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEconomicBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Delete the article (decrements totalArticles)
  await api.functional.economicBoard.articles.erase(superAdminConnection, {
    articleId: articleWithId.id,
  });
  // Ban the citizen user (increments activeBans)
  const ban = await generate_random_economic_board_administrator_bans_create(
    superAdminConnection,
    {
      body: {
        citizen_id: citizenJoinResult.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEconomicBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  // Retrieve metrics and validate all values
  const metrics =
    await api.functional.economicBoard.superAdministrator.metrics.index(
      superAdminConnection,
    );
  const metricsWithProperties = typia.assert<IEconomicBoardProfile & {
    totalUsers: number;
    sectionCreations24h: number;
    totalComments: number;
    activeBans: number;
    totalArticles: number;
  }>(metrics);
  // Validate: totalUsers increased by 1 (one citizen account created)
  TestValidator.equals("totalUsers increased by 1", metricsWithProperties.totalUsers, 1);
  // Validate: sectionCreations24h is exactly 1 (one section created)
  TestValidator.equals(
    "sectionCreations24h is 1",
    metricsWithProperties.sectionCreations24h,
    1,
  );
  // Validate: totalComments increased by 1 (one comment posted)
  TestValidator.equals(
    "totalComments increased by 1",
    metricsWithProperties.totalComments,
    1,
  );
  // Validate: activeBans is 1 (one user banned)
  TestValidator.equals("activeBans is 1", metricsWithProperties.activeBans, 1);
  // Validate: totalArticles decreased by 1 (one article deleted)
  TestValidator.equals(
    "totalArticles decreased by 1",
    metricsWithProperties.totalArticles,
    -1,
  );
}