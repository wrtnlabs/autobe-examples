import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_administrator_sections_create } from "../../../generate/generate_random_economic_board_administrator_sections_create";
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { generate_random_economic_board_citizen_articles_create } from "../../../generate/generate_random_economic_board_citizen_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";
import { prepare_random_economic_board_section } from "../../../prepare/prepare_random_economic_board_section";

export async function test_api_comment_edit_after_time_window_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin user and authenticate → get adminConnection1
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Register citizen first
  await authorize_citizen_join(adminConnection1, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // Then join as admin using same email/password
  await authorize_administrator_join(adminConnection1, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 2. Create a section for article placement
  const section =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection1,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Authenticate as citizen to create article (create separate citizen)
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: citizenEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // 4. Create an article in the section
  const article = await generate_random_economic_board_citizen_articles_create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Citizen posts a comment on the article
  const comment =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Authenticate as administrator to attempt override (same account that became admin)
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection2, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 7. Edit comment as citizen (original author) - should be forbidden after 60-minute window
  await TestValidator.error(
    "citizen cannot edit after 60-minute window",
    async () => {
      await api.functional.economicBoard.administrator.articles.comments.update(
        citizenConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEconomicBoardComment.IUpdate,
        },
      );
    },
  );
  // 8. Edit comment as admin (administrator account) - should also be forbidden after 60-minute window
  await TestValidator.error(
    "admin cannot edit after 60-minute window",
    async () => {
      await api.functional.economicBoard.administrator.articles.comments.update(
        adminConnection2,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEconomicBoardComment.IUpdate,
        },
      );
    },
  );
}
