import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test retrieval of contributor profile when the contributor does not exist.
 *
 * Verify that the endpoint properly rejects requests for non-existent
 * contributors even when a valid UUID format is provided. This tests the API's
 * business logic error handling for missing resources.
 *
 * Step-by-step process:
 *
 * 1. Generate a valid UUID format string
 * 2. Attempt to retrieve a contributor profile with a non-existent UUID
 * 3. Verify that an appropriate error is thrown
 * 4. Confirm the API properly handles missing resource scenarios
 */
export async function test_api_contributor_profile_invalid_uuid_format(
  connection: api.IConnection,
) {
  // Generate a valid UUID format that corresponds to a non-existent contributor
  const nonExistentContributorId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should reject retrieval of non-existent contributor with valid UUID",
    async () => {
      await api.functional.discussionBoard.contributors.at(connection, {
        contributorId: nonExistentContributorId,
      });
    },
  );
}
