import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticleStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatusLog";
export async function test_api_article_status_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid status log using typia.random
  const statusLog = typia.random<IDiscussionBoardArticleStatusLog>();
  typia.assert(statusLog);
  // Retrieve the same status log using its ID
  const retrievedLog =
    await api.functional.discussionBoard.articles.status_logs.at(connection, {
      articleId: statusLog.article_id,
      logId: statusLog.id,
    });
  typia.assert(retrievedLog);
  // Validate the retrieved log matches the generated one
  TestValidator.equals(
    "retrieved log ID matches generated log ID",
    retrievedLog.id,
    statusLog.id,
  );
  TestValidator.equals(
    "retrieved article_id matches generated article_id",
    retrievedLog.article_id,
    statusLog.article_id,
  );
  TestValidator.equals(
    "retrieved status matches generated status",
    retrievedLog.status,
    statusLog.status,
  );
  TestValidator.equals(
    "retrieved previous_status matches generated previous_status",
    retrievedLog.previous_status,
    statusLog.previous_status,
  );
  TestValidator.equals(
    "retrieved created_at matches generated created_at",
    retrievedLog.created_at,
    statusLog.created_at,
  );
}
