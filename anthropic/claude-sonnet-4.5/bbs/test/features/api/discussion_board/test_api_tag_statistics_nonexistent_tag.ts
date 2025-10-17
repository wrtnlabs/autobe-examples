import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTagStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTagStatistics";

/**
 * Test tag statistics retrieval with a non-existent tag ID.
 *
 * This test validates that the API properly handles error cases when attempting
 * to retrieve statistics for a tag that doesn't exist in the system. The test
 * creates a random UUID that won't correspond to any actual tag in the
 * database, calls the statistics endpoint with this non-existent tag ID, and
 * verifies that an appropriate error is returned.
 *
 * Steps:
 *
 * 1. Generate a random UUID for a non-existent tag
 * 2. Attempt to retrieve statistics for this non-existent tag
 * 3. Verify that an error is thrown (expected behavior)
 */
export async function test_api_tag_statistics_nonexistent_tag(
  connection: api.IConnection,
) {
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail when retrieving statistics for non-existent tag",
    async () => {
      await api.functional.discussionBoard.tags.statistics.at(connection, {
        tagId: nonExistentTagId,
      });
    },
  );
}
