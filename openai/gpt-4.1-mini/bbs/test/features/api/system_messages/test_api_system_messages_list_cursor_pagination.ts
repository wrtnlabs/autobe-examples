import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMessage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_messages_list_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Use base connection to create specific connections (no authentication needed since access control is null)
  const baseConnection: api.IConnection = { host: connection.host };
  // First page retrieval, assuming default parameters
  const page1: IPageIDiscussionBoardSystemMessage.ISummary =
    await api.functional.discussionBoard.system_messages.list.index(
      baseConnection,
    );
  typia.assert(page1);
  // If no data or only one page, test is trivial
  if (page1.pagination.pages <= 1) {
    // Data count must not exceed limit
    TestValidator.predicate(
      "page 1 data count <= limit",
      page1.data.length <= page1.pagination.limit,
    );
    return;
  }
  // We do 2 calls of the same API (because no parameters exist), assuming data can change during calls
  const page1_secondCall: IPageIDiscussionBoardSystemMessage.ISummary =
    await api.functional.discussionBoard.system_messages.list.index(
      baseConnection,
    );
  typia.assert(page1_secondCall);
  // Validate that the first page data between calls is stable
  TestValidator.equals(
    "first page repeatability",
    page1.data,
    page1_secondCall.data,
  );
  // Validate proper pagination fields
  TestValidator.predicate(
    "valid pagination current",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate("valid pagination limit", page1.pagination.limit > 0);
  TestValidator.predicate(
    "records consistent with data length",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.predicate(
    "pages consistent with records/limit",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit) ||
      (page1.pagination.records === 0 && page1.pagination.pages === 0),
  );
  // Since endpoint supports cursor-based pagination if DB allows, hypothetically next page retrieval to validate no duplication
  // But no SDK parameter support is provided, so real cursor test is not feasible
}
