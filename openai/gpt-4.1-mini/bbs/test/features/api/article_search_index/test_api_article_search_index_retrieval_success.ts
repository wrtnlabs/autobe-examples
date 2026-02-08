import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_index_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const indexId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.discussionBoard.article_search_indexes.at(
      actorConnection,
      {
        indexId,
      },
    );
  typia.assert(response);
}
