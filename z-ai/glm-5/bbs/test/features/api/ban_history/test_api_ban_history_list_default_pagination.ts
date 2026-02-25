import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_ban_history_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call the ban history index endpoint with empty request body (no filters)
  const response = await api.functional.discussionBoard.ban_histories.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardBanHistory.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination metadata with default values
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data length does not exceed limit
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // Validate each record structure if records exist
  if (response.data.length > 0) {
    const firstRecord = response.data[0]!;
    typia.assert(firstRecord);
    // Validate actor structure if not null
    if (firstRecord.actor !== null) {
      typia.assert<IDiscussionBoardUser.ISummary>(firstRecord.actor);
    }
    // Validate targetUser structure if not null
    if (firstRecord.targetUser !== null) {
      typia.assert<IDiscussionBoardUser.ISummary>(firstRecord.targetUser);
    }
  }
  // Validate sorting: records should be in descending order by createdAt
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentRecord = response.data[i]!;
      const nextRecord = response.data[i + 1]!;
      const currentDate = new Date(currentRecord.createdAt).getTime();
      const nextDate = new Date(nextRecord.createdAt).getTime();
      TestValidator.predicate(
        `records sorted by createdAt descending at index ${i}`,
        currentDate >= nextDate,
      );
    }
  }
}
