import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_search_index_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // This endpoint is publicly accessible (authorizationActor: null)
  // No authentication required - use base connection directly
  // Generate a valid UUID for testing
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Test successful retrieval of search index for a valid article ID
  const searchIndex = await api.functional.discussionBoard.search.indices.at(
    connection,
    { articleId },
  );
  // Validate response structure matches IDiscussionBoardSearchIndex schema
  typia.assert(searchIndex);
}
