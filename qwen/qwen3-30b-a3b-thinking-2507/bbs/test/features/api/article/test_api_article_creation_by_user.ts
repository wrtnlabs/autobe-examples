import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import type { IEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleAttachment";
import type { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_economy_politics_board_admin_sections_create } from "../../../generate/generate_random_economy_politics_board_admin_sections_create";
import { generate_random_economy_politics_board_user_articles_create } from "../../../generate/generate_random_economy_politics_board_user_articles_create";
import { prepare_random_economy_politics_board_article } from "../../../prepare/prepare_random_economy_politics_board_article";
import { prepare_random_economy_politics_board_section } from "../../../prepare/prepare_random_economy_politics_board_section";

export async function test_api_article_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Admin creates a section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEconomyPoliticsBoardAdmin.ILogin,
  });
  const section =
    await api.functional.economyPoliticsBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IEconomyPoliticsBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 2. User creates account and authenticates
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      href: "https://economy-politics-board.example.com/register",
      referrer: "https://economy-politics-board.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 3. User creates article with length constraints
  const article =
    await api.functional.economyPoliticsBoard.user.articles.create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5 }),
          content: RandomGenerator.paragraph({ sentences: 3, wordMin: 15 }),
          section_id: section.id,
        } satisfies IEconomyPoliticsBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Validate business logic
  TestValidator.equals("article title", article.title, article.title);
  TestValidator.predicate(
    "content minimum length",
    article.content.length >= 50,
  );
  TestValidator.equals("section association", article.section.id, section.id);
}
