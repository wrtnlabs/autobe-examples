import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_economy_politics_board_user_articles_create } from "../../../generate/generate_random_economy_politics_board_user_articles_create";
import { prepare_random_economy_politics_board_article } from "../../../prepare/prepare_random_economy_politics_board_article";

export async function test_api_article_tag_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Article creation (ensuring minimum title/content length)
  const article =
    await generate_random_economy_politics_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 25,
            sentenceMax: 35,
          }),
          section_id: RandomGenerator.alphaNumeric(32),
        } satisfies IEconomyPoliticsBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Retrieve first tag of the article
  if (article.tags.length === 0) {
    throw new Error("Article must have at least one tag");
  }
  const tagId = article.tags[0].id;
  // 4. Retrieve specific tag
  const tag = await api.functional.economyPoliticsBoard.articles.tags.at(
    userConnection,
    {
      articleId: article.id,
      tagId: tagId,
    },
  );
  typia.assert(tag);
  // 5. Validate tag content (max 30 chars)
  TestValidator.predicate("tag content length <= 30", tag.tag.length <= 30);
  // 6. Validate timestamps
  TestValidator.predicate("created_at format", tag.created_at.includes("T"));
  TestValidator.predicate("updated_at format", tag.updated_at.includes("T"));
  // 7. Validate soft delete status
  TestValidator.equals("deleted_at is null", tag.deleted_at, null);
}
