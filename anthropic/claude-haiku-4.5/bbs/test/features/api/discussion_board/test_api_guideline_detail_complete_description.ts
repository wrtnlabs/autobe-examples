import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";

export async function test_api_guideline_detail_complete_description(
  connection: api.IConnection,
) {
  // Retrieve a guideline with complete policy details
  const guidelineId = typia.random<string & tags.Format<"uuid">>();

  const guideline: IDiscussionBoardContentGuideline =
    await api.functional.discussionBoard.guidelines.at(connection, {
      guidelineId: guidelineId,
    });

  // Comprehensive type and format validation via typia.assert
  typia.assert(guideline);

  // Validate business logic: description provides detailed explanation
  TestValidator.predicate(
    "guideline description provides substantial detailed explanation of policy",
    guideline.description.length >= 50,
  );

  // Validate business logic: at least one application scope is true
  TestValidator.predicate(
    "guideline applies to at least articles or comments",
    guideline.applies_to_articles || guideline.applies_to_comments,
  );

  // Validate business logic: description is comprehensive for moderator reference
  TestValidator.predicate(
    "guideline description is comprehensive with examples and rationale",
    guideline.description.length > 100,
  );

  // Validate optional consequence field if present
  if (guideline.violation_consequence !== undefined) {
    TestValidator.predicate(
      "violation consequence provides helpful enforcement context",
      guideline.violation_consequence.length > 0,
    );
  }
}
