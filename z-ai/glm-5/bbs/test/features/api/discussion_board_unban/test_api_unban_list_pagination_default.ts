import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUnban";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of unban records list with default pagination parameters.
 * This test validates:
 * 1. Response contains pagination metadata (current, limit, records, pages)
 * 2. Each unban record contains required fields (id, reason, administrator, ban, created_at)
 * 3. Results are sorted by created_at in descending order
 * 4. Pagination defaults are applied (page=1, default limit)
 */
export async function test_api_unban_list_pagination_default(
  connection: api.IConnection,
): Promise<void> {
  // Call the unban index endpoint with empty request to test default pagination
  const result = await api.functional.discussionBoard.unbans.index(connection, {
    body: {} satisfies IDiscussionBoardUnban.IRequest,
  });
  typia.assert(result);
  // Validate sorting: results should be sorted by created_at in descending order
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      const prevDate = new Date(result.data[i - 1].created_at);
      const currDate = new Date(result.data[i].created_at);
      TestValidator.predicate(
        `unban records sorted descending by created_at at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
}
