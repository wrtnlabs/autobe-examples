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

/**
 * Test filtering ban history by target user and date range for targeted compliance queries.
 *
 * This test validates multi-criteria filtering capability for compliance audits
 * and administrative investigations by filtering ban history records by:
 * 1. Target user (discussion_board_user_id)
 * 2. Date range (created_at from/to)
 */
export async function test_api_ban_history_filter_by_user_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Generate a target user ID for filtering
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  // Define date range for filtering (year 2025)
  const dateFrom = "2025-01-01T00:00:00Z";
  const dateTo = "2025-12-31T23:59:59Z";
  // Query with both user and date range filters
  const response = await api.functional.discussionBoard.ban_histories.index(
    connection,
    {
      body: {
        discussion_board_user_id: targetUserId,
        created_at: {
          from: dateFrom,
          to: dateTo,
        },
      } satisfies IDiscussionBoardBanHistory.IRequest,
    },
  );
  typia.assert(response);
  // Validate all records match the target user filter
  for (const record of response.data) {
    // If targetUser is not null, it must match the requested user ID
    if (record.targetUser !== null) {
      TestValidator.equals(
        "target user ID matches filter",
        record.targetUser.id,
        targetUserId,
      );
    }
    // Validate createdAt falls within the date range (inclusive)
    const createdAt = new Date(record.createdAt).getTime();
    const fromTime = new Date(dateFrom).getTime();
    const toTime = new Date(dateTo).getTime();
    TestValidator.predicate(
      "createdAt within date range",
      createdAt >= fromTime && createdAt <= toTime,
    );
  }
}
