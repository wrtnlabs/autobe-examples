import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchResult";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_search_result_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create and retrieve a search result using a UUID
  const result = await api.functional.discussionBoard.search.results.at(
    connection,
    {
      resultId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  // Validate the result is of the correct type (IDiscussionBoardSearchResult)
  // Since IDiscussionBoardSearchResult is {}, this just validates it's an object
  typia.assert(result);
  // Verify it's a valid object
  TestValidator.predicate("result is an object", typeof result === "object");
}
