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

export async function test_api_article_update_by_author(
  connection: api.IConnection,
) {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const section =
    await generate_random_economy_politics_board_admin_sections_create(
      adminConnection,
      {}
    );
  // 2. User setup - create account and login
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Create article
  const article =
    await generate_random_economy_politics_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 5 }),
          section_id: section.id,
        },
      },
    );
  // 4. Update article
  const newTitle = RandomGenerator.paragraph({
    sentences: 1,
  }) satisfies IEconomyPoliticsBoardArticle.IUpdate["title"];
  const newContent = RandomGenerator.content({
    paragraphs: 2,
  }) satisfies IEconomyPoliticsBoardArticle.IUpdate["content"];
  const updatedArticle =
    await api.functional.economyPoliticsBoard.user.articles.update(
      userConnection,
      {
        articleId: article.id,
        body: {
          title: newTitle,
          content: newContent,
        },
      },
    );
  typia.assert(updatedArticle);
  // 5. Validate update
  TestValidator.equals(
    "updated title matches input",
    updatedArticle.title,
    newTitle,
  );
  TestValidator.equals(
    "updated content matches input",
    updatedArticle.content,
    newContent,
  );
  // Verify updated_at timestamp is new
  const originalUpdateTimestamp = new Date(article.updated_at);
  const newUpdateTimestamp = new Date(updatedArticle.updated_at);
  TestValidator.predicate(
    "new updated_at timestamp",
    newUpdateTimestamp > originalUpdateTimestamp,
  );
  // Verify creation timestamp remained unchanged
  TestValidator.equals(
    "creation timestamp matches original",
    updatedArticle.created_at,
    article.created_at,
  );
  // Verify author and section relationships remained unchanged
  TestValidator.equals(
    "author id matches original",
    updatedArticle.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "section id matches original",
    updatedArticle.section.id,
    article.section.id,
  );
  TestValidator.equals(
    "section name matches original",
    updatedArticle.section.name,
    article.section.name,
  );
}