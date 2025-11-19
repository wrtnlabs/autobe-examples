import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentGuideline";

/**
 * Test pagination functionality of the guidelines list endpoint.
 *
 * Validates that the API returns a properly paginated list of active content
 * guidelines with correct pagination metadata. The endpoint returns guidelines
 * in a paginated format with each page containing a subset of the total
 * guidelines. This test verifies:
 *
 * 1. Pagination metadata structure and validity (current page, limit, total
 *    records, total pages)
 * 2. Accurate pagination calculations and consistency
 * 3. Individual guideline items contain all required fields
 * 4. Guidelines data integrity and format validation
 * 5. Page structure enables clients to understand pagination context
 * 6. Pagination metadata properly indicates available pages and total records
 */
export async function test_api_guidelines_list_pagination_handling(
  connection: api.IConnection,
) {
  // Step 1: Retrieve paginated guidelines list
  const result: IPageIDiscussionBoardContentGuideline.ISummary =
    await api.functional.discussionBoard.guidelines.index(connection);
  typia.assert(result);

  // Step 2: Extract and validate pagination metadata
  const pagination: IPage.IPagination = result.pagination;
  TestValidator.predicate(
    "current page should be non-negative integer",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be positive integer",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative integer",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative integer",
    pagination.pages >= 0,
  );

  // Step 3: Validate pagination calculation consistency
  const expectedPages = Math.ceil(pagination.records / pagination.limit);
  TestValidator.predicate(
    "total pages should match ceil(records / limit) calculation",
    pagination.pages === expectedPages || pagination.records === 0,
  );

  // Step 4: Validate guidelines data structure and content
  const guidelines: IDiscussionBoardContentGuideline.ISummary[] = result.data;
  TestValidator.predicate(
    "guidelines array length should not exceed limit",
    guidelines.length <= pagination.limit,
  );
  TestValidator.predicate(
    "guidelines array should contain expected number of items",
    guidelines.length ===
      Math.min(
        pagination.limit,
        pagination.records - pagination.current * pagination.limit,
      ) || guidelines.length <= pagination.limit,
  );

  // Step 5: Validate each guideline item structure
  if (guidelines.length > 0) {
    for (const guideline of guidelines) {
      typia.assert(guideline);

      // Validate ID format (UUID)
      TestValidator.predicate(
        "guideline id should be valid UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          guideline.id,
        ),
      );

      // Validate code format (5-50 lowercase alphanumeric with hyphens)
      TestValidator.predicate(
        "guideline code should match required pattern",
        /^[a-z0-9-]{5,50}$/.test(guideline.code),
      );

      // Validate title length (10-100 characters)
      TestValidator.predicate(
        "guideline title should be between 10-100 characters",
        guideline.title.length >= 10 && guideline.title.length <= 100,
      );

      // Validate severity level is one of the allowed values
      TestValidator.predicate(
        "severity_level should be minor, moderate, or severe",
        ["minor", "moderate", "severe"].includes(guideline.severity_level),
      );

      // Validate is_active is boolean
      TestValidator.predicate(
        "is_active should be boolean value",
        typeof guideline.is_active === "boolean",
      );
    }
  }

  // Step 6: Verify pagination metadata provides accurate context
  TestValidator.predicate(
    "current page should be within valid range",
    pagination.current < pagination.pages || pagination.records === 0,
  );

  TestValidator.predicate(
    "limit should allow reasonable page sizes",
    pagination.limit >= 1 && pagination.limit <= 100,
  );

  // Step 7: Verify no duplicate guidelines in the current page
  const guidelineIds = guidelines.map((g) => g.id);
  const uniqueIds = new Set(guidelineIds);
  TestValidator.equals(
    "all guideline IDs on current page should be unique",
    guidelineIds.length,
    uniqueIds.size,
  );
}
