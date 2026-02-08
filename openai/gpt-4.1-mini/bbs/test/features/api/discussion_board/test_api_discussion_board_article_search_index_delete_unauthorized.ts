import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_article_search_index_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Unauthorized deletion attempt of an article search index record.
  // Attempt to delete an article search index without authentication.
  // Validate that the API rejects the request and returns 401 Unauthorized or 403 Forbidden error.
  // Using base connection without authentication deliberately to test unauthorized access
  const indexId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized deletion attempt rejecting with 401 or 403",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.article_search_indexes.erase(
        connection,
        {
          indexId,
        },
      );
    },
  );
}
