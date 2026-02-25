import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import type { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import type { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.economicPoliticalDiscussionBoard.articles.at(
      connection,
      {
        articleId,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "content length >= 100",
    article.content.length >= 100,
  );
}
