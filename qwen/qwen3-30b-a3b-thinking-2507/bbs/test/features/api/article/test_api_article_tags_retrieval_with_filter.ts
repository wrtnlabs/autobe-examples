import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import type { IEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleAttachment";
import type { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardArticle";
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

export async function test_api_article_tags_retrieval_with_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Create article with relevant tags including 'economy'
  const article =
    await generate_random_economy_politics_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          section_id: RandomGenerator.pick([
            "e99c3b7e-8f7a-4a77-aac4-4801c22b98b8",
            "b5f8e3a1-7a52-4a90-a33b-dde9d8e8c2c7",
          ]),
        },
      },
    );
  typia.assert(article);
  // 3. Retrieve tags with 'economy' filter
  const tagsPage =
    await api.functional.economyPoliticsBoard.articles.tags.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          filters: [
            {
              field: "tag",
              operator: "contains",
              value: "economy",
            },
          ],
        } satisfies IEconomyPoliticsBoardArticle.IRequest,
      },
    );
  typia.assert(tagsPage);
  // 4. Validate only economy tags returned
  const economyTags = typia
    .assert<IEconomyPoliticsBoardArticleTag[]>(tagsPage.data)
    .filter((tag) => tag.tag.includes("economy"));
  TestValidator.equals(
    "Only economy tags returned",
    economyTags.length,
    tagsPage.data.length,
  );
  if (economyTags.length > 0) {
    TestValidator.predicate(
      "Economy tag name matches",
      economyTags[0].tag === "economy",
    );
  } else {
    TestValidator.predicate("At least one economy tag found", false);
  }
}
