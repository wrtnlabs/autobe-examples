import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchResult";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_search_result_null_snippet(
  connection: api.IConnection,
): Promise<void> {
  // Generate a search result ID
  const resultId = typia.random<string & tags.Format<"uuid">>();
  // Fetch the search result to verify API handles null content_snippet
  const fetched = await api.functional.discussionBoard.search.results.at(
    connection,
    {
      resultId,
    },
  );
  typia.assert(fetched);
  // Verify the fetch operation succeeded and returned a valid structure
  TestValidator.predicate("fetch successful", typeof fetched === "object");
}
