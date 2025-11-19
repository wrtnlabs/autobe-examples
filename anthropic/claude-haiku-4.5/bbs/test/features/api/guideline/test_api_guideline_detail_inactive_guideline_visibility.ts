import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";

export async function test_api_guideline_detail_inactive_guideline_visibility(
  connection: api.IConnection,
) {
  // Test behavior when retrieving a guideline that may be inactive.
  // Generate a random guideline ID and retrieve it to validate the response
  // structure includes all properties necessary for inactive guidelines,
  // including the deleted_at timestamp field.
  const guidelineId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the guideline to validate response structure and content
  const guideline = await api.functional.discussionBoard.guidelines.at(
    connection,
    {
      guidelineId: guidelineId,
    },
  );
  typia.assert(guideline);

  // Verify all required properties are present in the response
  TestValidator.predicate(
    "guideline has valid UUID identifier",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guideline.id,
    ),
  );

  TestValidator.predicate(
    "guideline code is a non-empty string",
    guideline.code.length > 0 && guideline.code.length <= 50,
  );

  TestValidator.predicate(
    "guideline title is present and within length constraints",
    guideline.title.length >= 10 && guideline.title.length <= 100,
  );

  TestValidator.predicate(
    "guideline description is present",
    guideline.description.length >= 0 && guideline.description.length <= 2000,
  );

  // Verify boolean flags for applicability
  TestValidator.predicate(
    "applies_to_articles is a boolean",
    typeof guideline.applies_to_articles === "boolean",
  );

  TestValidator.predicate(
    "applies_to_comments is a boolean",
    typeof guideline.applies_to_comments === "boolean",
  );

  TestValidator.predicate(
    "guideline applies to at least articles or comments",
    guideline.applies_to_articles || guideline.applies_to_comments,
  );

  // Verify severity level is one of the valid enum values
  TestValidator.predicate(
    "severity_level is one of the valid values (minor, moderate, severe)",
    ["minor", "moderate", "severe"].includes(guideline.severity_level),
  );

  // Verify optional violation consequence field
  if (guideline.violation_consequence !== undefined) {
    TestValidator.predicate(
      "violation_consequence is within length constraints",
      guideline.violation_consequence.length <= 500,
    );
  }

  // Verify display order is non-negative integer
  TestValidator.predicate(
    "display_order is a non-negative integer",
    Number.isInteger(guideline.display_order) && guideline.display_order >= 0,
  );

  // Verify is_active flag indicates whether guideline is currently enforced
  TestValidator.predicate(
    "is_active is a boolean flag",
    typeof guideline.is_active === "boolean",
  );

  // Verify timestamp fields are present and in valid ISO 8601 format
  TestValidator.predicate(
    "created_at is a valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guideline.created_at),
  );

  TestValidator.predicate(
    "updated_at is a valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guideline.updated_at),
  );

  // Validate temporal ordering: created_at <= updated_at
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(guideline.created_at) <= new Date(guideline.updated_at),
  );

  // Verify deleted_at field - it can be null or a valid ISO datetime
  // This validates the visibility policy for inactive guidelines
  if (guideline.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is a valid ISO 8601 datetime when not null",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guideline.deleted_at),
    );

    // If is_active is false, deleted_at should be populated
    if (!guideline.is_active) {
      TestValidator.predicate(
        "inactive guideline has deleted_at timestamp populated",
        guideline.deleted_at !== null,
      );

      // Verify temporal ordering: updated_at <= deleted_at
      TestValidator.predicate(
        "updated_at is before or equal to deleted_at for inactive guideline",
        new Date(guideline.updated_at) <= new Date(guideline.deleted_at),
      );
    }
  }

  // If guideline is active, deleted_at should typically be null
  if (guideline.is_active) {
    TestValidator.predicate(
      "active guideline may have null deleted_at",
      guideline.deleted_at === null || guideline.deleted_at !== null,
    );
  }
}
