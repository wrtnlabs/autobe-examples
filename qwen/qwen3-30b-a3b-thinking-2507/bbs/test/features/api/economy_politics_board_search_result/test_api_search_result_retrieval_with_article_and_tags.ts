import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import type { IEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleAttachment";
import type { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import type { IEconomyPoliticsBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchResult";
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

export async function test_api_search_result_retrieval_with_article_and_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "adminpassword",
      href: "http://test.com",
      referrer: "http://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomyPoliticsBoardAdmin.IJoin,
  });
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: "adminpassword",
    } satisfies IEconomyPoliticsBoardAdmin.ILogin,
  });
  // 2. Section setup
  const section =
    await generate_random_economy_politics_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IEconomyPoliticsBoardSection.ICreate,
      },
    );
  // 3. User setup
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: userEmail,
      password: "userpassword",
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  const userLogin = await authorize_user_login(userConnection, {
    body: {
      email: userEmail,
      password: "userpassword",
    } satisfies IEconomyPoliticsBoardUser.ILogin,
  });
  // 4. Article setup
  const article =
    await generate_random_economy_politics_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 10 }),
          section_id: section.id,
        } satisfies IEconomyPoliticsBoardArticle.ICreate,
      },
    );
  // 5. Retrieve search result
  const searchResult =
    await api.functional.economyPoliticsBoard.user.results.at(userConnection, {
      resultId: article.id,
    });
  typia.assert(searchResult);
  // 6. Validate search result
  TestValidator.equals(
    "article should match search result article",
    searchResult.article.id,
    article.id,
  );
  TestValidator.equals(
    "article should match search result article's title",
    searchResult.article.title,
    article.title,
  );
  TestValidator.equals(
    "search result should have tag",
    searchResult.tag !== undefined,
    true,
  );
}