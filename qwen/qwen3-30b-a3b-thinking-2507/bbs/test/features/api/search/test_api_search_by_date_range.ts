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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardSearchResult";
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

export async function test_api_search_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin section creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  const section =
    await generate_random_economy_politics_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section",
          description: "Test section for article creation",
        },
      },
    );
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  // 3. Create articles with different timestamps
  const article1 =
    await generate_random_economy_politics_board_user_articles_create(
      userConnection,
      {
        body: {
          title: "Article 1",
          content: "This is article 1",
          section_id: section.id,
        },
      },
    );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const article2 =
    await generate_random_economy_politics_board_user_articles_create(
      userConnection,
      {
        body: {
          title: "Article 2",
          content: "This is article 2",
          section_id: section.id,
        },
      },
    );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const article3 =
    await generate_random_economy_politics_board_user_articles_create(
      userConnection,
      {
        body: {
          title: "Article 3",
          content: "This is article 3",
          section_id: section.id,
        },
      },
    );
  // 4. Define date range
  const fromDate = article1.created_at;
  const toDate = article2.created_at;
  // 5. Perform search
  const results = await api.functional.economyPoliticsBoard.user.results.index(
    userConnection,
    {
      body: {
        fromDate,
        toDate,
      },
    },
  );
  typia.assert(results);
  // 6. Validate results
  const foundArticle2 = results.data.some(
    (item) => item.article.id === article2.id,
  );
  const foundArticle1 = results.data.some(
    (item) => item.article.id === article1.id,
  );
  const foundArticle3 = results.data.some(
    (item) => item.article.id === article3.id,
  );
  TestValidator.equals(
    "Article 2 (within date range) should be found",
    foundArticle2,
    true,
  );
  TestValidator.equals(
    "Article 1 (on start of date range) should be found",
    foundArticle1,
    true,
  );
  TestValidator.notEquals(
    "Article 3 (after date range) should NOT be found",
    foundArticle3,
    true,
  );
}
