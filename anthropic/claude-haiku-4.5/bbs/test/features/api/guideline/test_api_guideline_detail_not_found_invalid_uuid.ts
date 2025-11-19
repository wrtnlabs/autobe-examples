import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";

/**
 * Test error handling when requesting a guideline with an invalid UUID that
 * does not exist.
 *
 * This test validates that the API endpoint correctly returns an appropriate
 * error response when attempting to retrieve a guideline using a UUID that
 * doesn't correspond to any existing guideline in the system. The test ensures
 * proper error handling for non-existent resource access attempts.
 *
 * Steps:
 *
 * 1. Generate a random, valid UUID format string
 * 2. Attempt to retrieve a guideline with the non-existent UUID
 * 3. Verify that the API returns an error response (404 Not Found)
 */
export async function test_api_guideline_detail_not_found_invalid_uuid(
  connection: api.IConnection,
) {
  // Generate a valid UUID format that does not exist in the system
  const nonExistentGuidelineId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve a guideline with the non-existent UUID
  // This should throw an error indicating the guideline was not found
  await TestValidator.error(
    "non-existent guideline should return error",
    async () => {
      await api.functional.discussionBoard.guidelines.at(connection, {
        guidelineId: nonExistentGuidelineId,
      });
    },
  );
}
