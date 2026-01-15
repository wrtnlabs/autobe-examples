import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";
export async function test_api_appeal_list_with_content_identifier_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for testing
  const testConnection: api.IConnection = { host: connection.host };
  // Generate a random content identifier for filtering
  const targetContentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the index endpoint with a filter by reported_content_id
  const result: IPageIDiscussionBoardAppeal.ISummary =
    await api.functional.discussionBoard.appeals.index(testConnection, {
      body: {
        reported_content_id: targetContentId,
      } satisfies IDiscussionBoardAppeal.IRequest,
    });
  typia.assert(result);
  // Validate the pagination structure
  TestValidator.predicate(
    "pagination is valid",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    result.pagination.limit >= 1 && result.pagination.limit <= 100,
  );
  TestValidator.predicate("records is valid", result.pagination.records >= 0);
  TestValidator.predicate("pages is valid", result.pagination.pages >= 0);
  // Validate that data array is present and contains valid Appeal summary items
  TestValidator.predicate("data array is not null", Array.isArray(result.data));
  result.data.forEach((appeal) => {
    TestValidator.equals("appeal id format", appeal.id.length, 36);
    TestValidator.predicate(
      "appeal status is valid",
      appeal.status === "pending" ||
        appeal.status === "approved" ||
        appeal.status === "rejected" ||
        appeal.status === "resolved",
    );
    TestValidator.predicate(
      "appeal type is valid",
      appeal.type === "content_removal" ||
        appeal.type === "user_suspension" ||
        appeal.type === "account_ban",
    );
    TestValidator.equals(
      "appeal reported_content_id format",
      appeal.reported_content_id.length,
      36,
    );
    TestValidator.predicate(
      "appeal created_at format",
      new Date(appeal.created_at).toString() !== "Invalid Date",
    );
    TestValidator.predicate(
      "appeal priority is valid",
      appeal.priority === "low" ||
        appeal.priority === "medium" ||
        appeal.priority === "high",
    );
    TestValidator.equals(
      "appeal citizen_id format",
      appeal.citizen_id.length,
      36,
    );
  });
}
