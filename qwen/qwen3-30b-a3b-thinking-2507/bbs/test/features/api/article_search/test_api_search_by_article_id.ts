import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_economy_politics_board_user_articles_create } from "../../../generate/generate_random_economy_politics_board_user_articles_create";
import { prepare_random_economy_politics_board_article } from "../../../prepare/prepare_random_economy_politics_board_article";

export async function test_api_search_by_article_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  // 2. Create article
  const article =
    await generate_random_economy_politics_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 15,
            sentenceMax: 30,
          }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 3. Search for article by ID
  const results = await api.functional.economyPoliticsBoard.user.results.index(
    userConnection,
    {
      body: {
        articleId: article.id,
      },
    },
  );
  typia.assert(results);
  // 4. Validate search results
  TestValidator.equals(
    "should find article",
    results.data[0].article.id,
    article.id,
  );
  TestValidator.predicate("title length ≥5", article.title.length >= 5);
  TestValidator.predicate("content length ≥50", article.content.length >= 50);
}
