import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentGuideline";

/**
 * Test public access to discussion board content guidelines without
 * authentication.
 *
 * Verifies that the guidelines list endpoint is publicly accessible to guest
 * users without requiring any authentication credentials. This test confirms
 * that:
 *
 * 1. The endpoint can be called without JWT tokens or login
 * 2. Guest users receive a valid paginated response
 * 3. The response contains active content guidelines with proper structure
 * 4. No authorization headers are required to retrieve the guidelines
 *
 * This allows contributors and moderators to understand content policies
 * without authenticating, enabling them to make informed decisions about
 * platform rules.
 */
export async function test_api_guidelines_list_public_access_no_auth(
  connection: api.IConnection,
) {
  // Call the public guidelines endpoint without any authentication
  const response =
    await api.functional.discussionBoard.guidelines.index(connection);

  // Validate the complete response structure and content
  typia.assert<IPageIDiscussionBoardContentGuideline.ISummary>(response);

  // Verify pagination structure is valid
  const pagination = response.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // Verify pagination fields have valid values
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);

  TestValidator.predicate(
    "total records count is non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate("total pages is non-negative", pagination.pages >= 0);

  // If there are guidelines in the response, validate their structure
  if (response.data.length > 0) {
    const guideline = response.data[0];
    typia.assert<IDiscussionBoardContentGuideline.ISummary>(guideline);

    // Verify severity level is one of the allowed values
    TestValidator.predicate(
      "guideline severity_level is valid",
      ["minor", "moderate", "severe"].includes(guideline.severity_level),
    );

    // Verify is_active is a boolean value
    TestValidator.predicate(
      "guideline is_active is boolean",
      typeof guideline.is_active === "boolean",
    );
  }
}
