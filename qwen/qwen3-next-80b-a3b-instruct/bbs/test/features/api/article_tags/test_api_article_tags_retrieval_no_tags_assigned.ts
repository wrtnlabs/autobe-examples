import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardSearchArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSearchArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_tags_retrieval_no_tags_assigned(
  connection: api.IConnection,
): Promise<void> {
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const tags = await api.functional.economicBoard.articles.tags.getByArticleid(
    connection,
    {
      articleId,
    },
  );
  typia.assert(tags);
}
