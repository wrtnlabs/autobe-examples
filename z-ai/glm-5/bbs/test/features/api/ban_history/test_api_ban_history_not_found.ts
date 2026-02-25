import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test error handling when requesting a ban history record that does not exist.
 *
 * This test validates that:
 * 1. When requesting a ban history with a non-existent UUID, the API returns HTTP 404
 * 2. The system properly handles requests for non-existent resources
 * 3. The error handling provides appropriate feedback for missing audit records
 */
export async function test_api_ban_history_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the database
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Test that requesting a non-existent ban history returns HTTP 404
  await TestValidator.httpError(
    "should return 404 for non-existent ban history",
    404,
    async () => {
      await api.functional.discussionBoard.ban_histories.at(connection, {
        banHistoryId: nonExistentId,
      });
    },
  );
}
