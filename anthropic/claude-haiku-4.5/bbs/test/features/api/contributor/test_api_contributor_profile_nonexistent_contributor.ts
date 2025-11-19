import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test retrieval of a contributor using a valid UUID format that does not
 * correspond to any existing contributor account.
 *
 * This test validates that the GET
 * /discussionBoard/contributors/{contributorId} endpoint properly handles
 * requests for non-existent contributors. It verifies that the API returns an
 * appropriate error response (404 Not Found) when attempting to retrieve a
 * contributor profile with a valid UUID that doesn't exist in the system.
 *
 * Test steps:
 *
 * 1. Generate a valid UUID that does not correspond to any existing contributor
 * 2. Attempt to retrieve the contributor profile using this non-existent ID
 * 3. Verify that the API returns a 404 error or appropriate error response
 * 4. Confirm the error handling is consistent with API specifications
 */
export async function test_api_contributor_profile_nonexistent_contributor(
  connection: api.IConnection,
) {
  // Step 1: Generate a valid UUID that does not correspond to any existing contributor
  const nonexistentContributorId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Attempt to retrieve the contributor profile using the non-existent ID
  // Step 3: Verify that the API returns a 404 error
  await TestValidator.error(
    "should return error when retrieving non-existent contributor",
    async () => {
      await api.functional.discussionBoard.contributors.at(connection, {
        contributorId: nonexistentContributorId,
      });
    },
  );
}
