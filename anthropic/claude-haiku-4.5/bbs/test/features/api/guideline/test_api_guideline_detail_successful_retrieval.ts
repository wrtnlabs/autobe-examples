import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";

/**
 * Test successful retrieval of a specific content guideline by ID.
 *
 * This test validates that the endpoint returns the complete guideline object
 * with all properties including id, code, title, description, severity level,
 * applicability flags, violation consequence, display order, active status,
 * timestamps, and soft delete marker. Verifies that the response contains the
 * full policy details needed for contributors to understand community standards
 * and moderators to reference when making moderation decisions.
 *
 * The test generates a random guideline ID, retrieves the guideline details,
 * and validates that the response contains meaningful policy data with proper
 * business logic constraints.
 */
export async function test_api_guideline_detail_successful_retrieval(
  connection: api.IConnection,
) {
  // Generate a random guideline ID in UUID format
  const guidelineId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the specific guideline by ID
  const guideline = await api.functional.discussionBoard.guidelines.at(
    connection,
    {
      guidelineId,
    },
  );

  // Validate that the response is a complete IDiscussionBoardContentGuideline object
  // This performs COMPLETE validation of all types, formats, and constraints
  typia.assert(guideline);

  // Verify business logic: at least one of the applicability flags should be true
  TestValidator.predicate(
    "guideline should apply to articles or comments or both",
    guideline.applies_to_articles || guideline.applies_to_comments,
  );

  // Verify logical consistency: created_at should be before or equal to updated_at
  TestValidator.predicate(
    "created_at should be before or equal to updated_at",
    new Date(guideline.created_at) <= new Date(guideline.updated_at),
  );

  // Verify that if deleted_at is set, it should be after created_at
  if (guideline.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at should be after created_at for soft-deleted guidelines",
      new Date(guideline.created_at) <= new Date(guideline.deleted_at),
    );
  }

  // Verify that the guideline has meaningful content (non-empty strings)
  TestValidator.predicate(
    "guideline should have non-empty code",
    guideline.code.length > 0,
  );

  TestValidator.predicate(
    "guideline should have non-empty title",
    guideline.title.length > 0,
  );

  TestValidator.predicate(
    "guideline should have non-empty description",
    guideline.description.length > 0,
  );

  // Verify that the response contains all expected data fields
  TestValidator.predicate(
    "guideline should have valid severity level set",
    guideline.severity_level in { minor: true, moderate: true, severe: true },
  );
}
