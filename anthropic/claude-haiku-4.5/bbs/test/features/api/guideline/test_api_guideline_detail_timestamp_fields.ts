import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";

/**
 * Test that the guideline response includes created_at and updated_at
 * timestamps in ISO 8601 format, and a deleted_at field that is null for active
 * guidelines or contains a timestamp for soft-deleted guidelines. Verify that
 * audit trail timestamps are properly maintained.
 */
export async function test_api_guideline_detail_timestamp_fields(
  connection: api.IConnection,
) {
  // Generate a random guideline ID for testing
  const guidelineId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the guideline details
  const guideline: IDiscussionBoardContentGuideline =
    await api.functional.discussionBoard.guidelines.at(connection, {
      guidelineId,
    });

  // Validate the response structure and all timestamp formats
  typia.assert(guideline);

  // Validate audit trail: created_at should be before or equal to updated_at
  TestValidator.predicate(
    "created_at should be before or equal to updated_at",
    () => {
      const createdDate = new Date(guideline.created_at);
      const updatedDate = new Date(guideline.updated_at);
      return createdDate.getTime() <= updatedDate.getTime();
    },
  );

  // Validate audit trail: if deleted_at exists, updated_at should be before or equal to deleted_at
  TestValidator.predicate(
    "if deleted_at exists, updated_at should be before or equal to deleted_at",
    () => {
      if (guideline.deleted_at === null) {
        return true;
      }
      const updatedDate = new Date(guideline.updated_at);
      const deletedDate = new Date(guideline.deleted_at);
      return updatedDate.getTime() <= deletedDate.getTime();
    },
  );

  // Validate that deleted_at is null for active guidelines
  TestValidator.predicate(
    "deleted_at should indicate whether guideline is soft-deleted",
    () => {
      // deleted_at is either null (active) or contains a timestamp (deleted)
      return guideline.deleted_at === null || guideline.deleted_at.length > 0;
    },
  );
}
