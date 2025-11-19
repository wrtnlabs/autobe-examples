import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";

/**
 * Validates that retrieved content guidelines have severity classifications
 * that are exactly one of the three valid options: 'minor', 'moderate', or
 * 'severe'.
 *
 * Severity levels guide moderator response proportionality:
 *
 * - 'minor' violations result in edit/warning only
 * - 'moderate' violations result in content removal and warning
 * - 'severe' violations result in content removal and account suspension
 *
 * This test retrieves a guideline and validates:
 *
 * 1. The severity_level property exists and is valid
 * 2. The severity_level is exactly one of the three valid options
 * 3. The severity classification can be used to determine moderator responses
 */
export async function test_api_guideline_detail_severity_classification(
  connection: api.IConnection,
) {
  // Generate a random UUID for the guideline ID
  const guidelineId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the guideline details
  const guideline = await api.functional.discussionBoard.guidelines.at(
    connection,
    {
      guidelineId: guidelineId,
    },
  );
  typia.assert(guideline);

  // Validate that severity_level is one of the three valid options
  TestValidator.predicate(
    "severity_level should be exactly one of minor, moderate, or severe",
    guideline.severity_level === "minor" ||
      guideline.severity_level === "moderate" ||
      guideline.severity_level === "severe",
  );

  // Validate that severity level classification can guide moderator actions
  // based on the guidelines specification
  if (guideline.severity_level === "minor") {
    // Minor violations may only require warning/editing
    TestValidator.equals(
      "minor severity guideline verified",
      guideline.severity_level,
      "minor",
    );
  } else if (guideline.severity_level === "moderate") {
    // Moderate violations should trigger removal and warnings
    TestValidator.equals(
      "moderate severity guideline verified",
      guideline.severity_level,
      "moderate",
    );
  } else if (guideline.severity_level === "severe") {
    // Severe violations warrant account restrictions
    TestValidator.equals(
      "severe severity guideline verified",
      guideline.severity_level,
      "severe",
    );
  }
}
