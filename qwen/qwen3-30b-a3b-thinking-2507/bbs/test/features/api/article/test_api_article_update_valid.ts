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
import { generate_random_economy_politics_board_user_articles_create } from "../../../generate/generate_random_economy_politics_board_user_articles_create";
import { prepare_random_economy_politics_board_article } from "../../../prepare/prepare_random_economy_politics_board_article";

export async function test_api_article_update_valid(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEconomyPoliticsBoardAdmin.ILogin,
  });
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  const article =
    await api.functional.economyPoliticsBoard.user.articles.create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          section_id: "00000000-0000-0000-0000-000000000000",
        } satisfies IEconomyPoliticsBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  const updatedArticle =
    await api.functional.economyPoliticsBoard.admin.articles.update(
      adminConnection,
      {
        articleId: article.id,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 255,
          }),
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 50,
            sentenceMax: 5000,
          }),
        } satisfies IEconomyPoliticsBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  TestValidator.equals(
    "title matches update",
    updatedArticle.title,
    RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 255 }),
  );
  TestValidator.predicate(
    "title length within range",
    updatedArticle.title.length >= 5 && updatedArticle.title.length <= 255,
  );
  TestValidator.equals(
    "content matches update",
    updatedArticle.content,
    RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 50,
      sentenceMax: 5000,
    }),
  );
  TestValidator.predicate(
    "content length within range",
    updatedArticle.content.length >= 50 &&
      updatedArticle.content.length <= 5000,
  );
  TestValidator.notEquals(
    "timestamp should update",
    updatedArticle.updated_at,
    article.updated_at,
  );
}
