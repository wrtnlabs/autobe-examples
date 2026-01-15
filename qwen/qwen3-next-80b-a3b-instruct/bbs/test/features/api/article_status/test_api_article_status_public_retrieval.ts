import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatus";
export async function test_api_article_status_public_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid article status
  const statusId = typia.random<IDiscussionBoardArticleStatus>();
  // Make the API call using the generated status ID
  const response: IDiscussionBoardArticleStatus =
    await api.functional.discussionBoard.articles.statuses.at(connection, {
      statusId,
    });
  // Validate the response type and content
  typia.assert(response);
  // Verify the returned status matches the requested status
  TestValidator.equals(
    "retrieved status matches requested status",
    response,
    statusId,
  );
}
