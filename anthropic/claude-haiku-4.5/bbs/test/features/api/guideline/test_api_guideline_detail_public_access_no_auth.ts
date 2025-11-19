import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";

export async function test_api_guideline_detail_public_access_no_auth(
  connection: api.IConnection,
) {
  /**
   * Test that the content guideline endpoint is publicly accessible without
   * authentication.
   *
   * This test verifies that guest users can retrieve specific guideline details
   * without JWT tokens or authorization headers, confirming the endpoint is
   * publicly available for policy transparency. The endpoint allows community
   * members to understand content standards before participation.
   *
   * Steps:
   *
   * 1. Create an unauthenticated connection (empty headers)
   * 2. Generate a guideline ID to request
   * 3. Call the public endpoint without authentication
   * 4. Verify successful response with proper guideline structure
   * 5. Validate all required properties are present with correct types
   */

  /**
   * Create an unauthenticated connection by removing authorization headers.
   * This simulates a guest user accessing the public guidelines endpoint
   * without any authentication credentials.
   */
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  /**
   * Generate a random UUID to use as the guideline ID for testing. In
   * simulation mode, this will generate a valid random guideline.
   */
  const guidelineId = typia.random<string & tags.Format<"uuid">>();

  /**
   * Call the public endpoint to retrieve guideline details without
   * authentication. The endpoint should be accessible to guest users according
   * to the API documentation, allowing them to review community standards
   * without logging in.
   */
  const guideline = await api.functional.discussionBoard.guidelines.at(
    unauthConn,
    {
      guidelineId,
    },
  );

  /**
   * Validate that the response matches the IDiscussionBoardContentGuideline
   * type. This ensures all required fields are present with correct types and
   * formats, confirming the API contract is properly maintained.
   */
  typia.assert(guideline);

  /**
   * Verify that the guideline ID in response matches the requested ID. This
   * confirms we retrieved the correct specific guideline.
   */
  TestValidator.equals(
    "guideline ID matches request",
    guideline.id,
    guidelineId,
  );

  /**
   * Verify that the guideline code is valid according to its constraints. Code
   * must be 5-50 lowercase alphanumeric characters with hyphens, used for
   * machine-readable identification in logs.
   */
  TestValidator.predicate("guideline code satisfies format constraints", () => {
    const code = guideline.code;
    return code.length >= 5 && code.length <= 50 && /^[a-z0-9-]+$/.test(code);
  });

  /**
   * Verify that the guideline title is within required length constraints.
   * Title must be 10-100 characters for display in moderation dashboards.
   */
  TestValidator.predicate(
    "guideline title satisfies length constraints",
    () => {
      const title = guideline.title;
      return title.length >= 10 && title.length <= 100;
    },
  );

  /**
   * Verify that the guideline description is present and within length
   * constraints. Description can be up to 2000 characters and explains policy
   * details and examples.
   */
  TestValidator.predicate("guideline description is valid", () => {
    return (
      guideline.description.length > 0 && guideline.description.length <= 2000
    );
  });

  /**
   * Verify that the severity level is one of the valid options. Severity levels
   * (minor, moderate, severe) guide moderator response proportionality.
   */
  TestValidator.predicate("guideline severity level is valid", () => {
    const validLevels = ["minor", "moderate", "severe"];
    return validLevels.includes(guideline.severity_level);
  });

  /**
   * Verify that applies_to flags are boolean values. These indicate whether the
   * guideline applies to articles and/or comments.
   */
  TestValidator.predicate("guideline applies_to properties are valid", () => {
    return (
      typeof guideline.applies_to_articles === "boolean" &&
      typeof guideline.applies_to_comments === "boolean"
    );
  });

  /**
   * Verify that display order is a non-negative integer. Used for organizing
   * guidelines in user-facing policy documentation.
   */
  TestValidator.predicate("guideline display order is non-negative", () => {
    return guideline.display_order >= 0;
  });

  /**
   * Verify that the is_active flag is boolean. Indicates whether the guideline
   * is currently enforced.
   */
  TestValidator.predicate("guideline is_active is valid boolean", () => {
    return typeof guideline.is_active === "boolean";
  });

  /**
   * Verify that created_at timestamp is in ISO 8601 format. Marks when the
   * guideline was first established in the system.
   */
  TestValidator.predicate("guideline created_at is valid ISO 8601", () => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guideline.created_at);
  });

  /**
   * Verify that updated_at timestamp is in ISO 8601 format. Updated when policy
   * descriptions or enforcement rules change.
   */
  TestValidator.predicate("guideline updated_at is valid ISO 8601", () => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guideline.updated_at);
  });

  /**
   * Verify that deleted_at is either null or a valid ISO 8601 timestamp. Null
   * for active guidelines; set when soft-deleted or made inactive.
   */
  TestValidator.predicate(
    "guideline deleted_at is null or valid ISO 8601",
    () => {
      if (guideline.deleted_at === null) {
        return true;
      }
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guideline.deleted_at);
    },
  );

  /**
   * Verify that violation_consequence (if present) is within length
   * constraints. This optional field describes typical consequences for
   * violations up to 500 characters.
   */
  TestValidator.predicate(
    "guideline violation_consequence is valid if present",
    () => {
      if (guideline.violation_consequence === undefined) {
        return true;
      }
      return (
        guideline.violation_consequence.length > 0 &&
        guideline.violation_consequence.length <= 500
      );
    },
  );
}
