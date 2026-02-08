import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_index_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for a non-existent indexId
  const nonExistentIndexId = typia.random<string & tags.Format<"uuid">>();
  // Function to call the API with the non-existent indexId and expect a 404 error
  await TestValidator.httpError(
    "should fail with 404 for non-existent article search index",
    404,
    async () => {
      const result =
        await api.functional.discussionBoard.article_search_indexes.at(
          connection,
          { indexId: nonExistentIndexId },
        );
      // The call should throw before this is reached
      typia.assert(result);
    },
  );
}
