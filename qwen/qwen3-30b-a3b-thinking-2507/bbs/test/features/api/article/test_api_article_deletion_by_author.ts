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

export async function test_api_article_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEconomyPoliticsBoardAdmin.ILogin,
  });
  // 2. Create section as admin
  const section =
    await api.functional.economyPoliticsBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name() + " Section",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomyPoliticsBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. User setup
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 4. Create article as user
  const article =
    await api.functional.economyPoliticsBoard.user.articles.create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: section.id,
        } satisfies IEconomyPoliticsBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 5. Delete article as user
  const deletedArticle =
    await api.functional.economyPoliticsBoard.user.articles.erase(
      userConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(deletedArticle);
  // 6. Verify soft delete
  TestValidator.equals(
    "article title preserved",
    deletedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content preserved",
    deletedArticle.content,
    article.content,
  );
  TestValidator.predicate(
    "deleted timestamp present",
    deletedArticle.deleted_at !== null,
  );
}
