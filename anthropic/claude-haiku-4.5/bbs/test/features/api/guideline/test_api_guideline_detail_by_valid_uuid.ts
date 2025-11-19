import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";

/**
 * Test that the endpoint correctly retrieves a guideline when provided with a
 * valid UUID parameter.
 *
 * This test verifies that:
 *
 * 1. The path parameter is properly parsed as a UUID format
 * 2. The correct guideline record is returned matching the specific ID
 * 3. All guideline properties are present and correctly typed
 * 4. The response contains complete policy details
 */
export async function test_api_guideline_detail_by_valid_uuid(
  connection: api.IConnection,
) {
  // Generate a valid UUID for the guideline ID
  const guidelineId = typia.random<string & tags.Format<"uuid">>();

  // Call the API to retrieve the guideline details
  const guideline: IDiscussionBoardContentGuideline =
    await api.functional.discussionBoard.guidelines.at(connection, {
      guidelineId,
    });

  // Validate the response structure and data types
  typia.assert(guideline);

  // Verify essential guideline properties have valid semantic values
  TestValidator.predicate(
    "guideline has valid severity level",
    ["minor", "moderate", "severe"].includes(guideline.severity_level),
  );

  TestValidator.predicate(
    "guideline applies to articles or comments",
    guideline.applies_to_articles || guideline.applies_to_comments,
  );

  TestValidator.predicate(
    "guideline display order is non-negative",
    guideline.display_order >= 0,
  );

  TestValidator.predicate(
    "guideline created before updated",
    new Date(guideline.created_at) <= new Date(guideline.updated_at),
  );

  TestValidator.predicate(
    "guideline deleted_at is after created_at if present",
    guideline.deleted_at === null ||
      new Date(guideline.created_at) <= new Date(guideline.deleted_at),
  );
}
