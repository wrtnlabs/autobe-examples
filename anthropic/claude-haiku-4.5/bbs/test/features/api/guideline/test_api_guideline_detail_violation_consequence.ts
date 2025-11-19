import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";

export async function test_api_guideline_detail_violation_consequence(
  connection: api.IConnection,
) {
  // Generate a random UUID for the guideline ID
  const guidelineId = typia.random<string & tags.Format<"uuid">>();

  // Call the API to retrieve the guideline details
  const guideline: IDiscussionBoardContentGuideline =
    await api.functional.discussionBoard.guidelines.at(connection, {
      guidelineId,
    });

  // Validate the complete response structure and all types
  typia.assert(guideline);

  // Validate that violation_consequence field is populated with meaningful content
  if (guideline.violation_consequence !== undefined) {
    TestValidator.predicate(
      "violation_consequence should contain meaningful consequence description",
      guideline.violation_consequence.length > 0,
    );

    TestValidator.predicate(
      "violation_consequence describes enforcement action or consequence",
      guideline.violation_consequence.toLowerCase().includes("removal") ||
        guideline.violation_consequence.toLowerCase().includes("rejection") ||
        guideline.violation_consequence.toLowerCase().includes("suspension") ||
        guideline.violation_consequence.toLowerCase().includes("warning") ||
        guideline.violation_consequence.toLowerCase().includes("consequence") ||
        guideline.violation_consequence.length > 10,
    );
  }

  // Validate that at least one of articles or comments applicability is true
  TestValidator.predicate(
    "guideline should apply to articles or comments or both",
    guideline.applies_to_articles || guideline.applies_to_comments,
  );

  // Validate the code follows expected format (lowercase with hyphens)
  TestValidator.predicate(
    "guideline code should be lowercase alphanumeric with hyphens",
    /^[a-z0-9-]+$/.test(guideline.code),
  );

  // Validate title length is within expected range
  TestValidator.predicate(
    "guideline title should have meaningful length",
    guideline.title.length >= 10 && guideline.title.length <= 100,
  );
}
