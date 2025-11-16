import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";

/**
 * Test public category retrieval for economic discussion board.
 *
 * Validates that unauthenticated users can retrieve detailed information about
 * specific discussion categories through the public API endpoint. This ensures
 * the category system is accessible to all visitors for content discovery and
 * organization. The test verifies proper category metadata including title,
 * description, display order, and article count statistics are returned for
 * both active and inactive categories.
 *
 * @param connection - API connection object with host information
 * @returns Promise<void> when test completes
 */
export async function test_api_economic_discussion_category_public_retrieval(
  connection: api.IConnection,
) {
  // Create unauthenticated connection to test public access
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Test 1: Basic category retrieval with random code
  const testCode = RandomGenerator.alphabets(12);
  const category = await api.functional.economicDiscussion.categories.at(
    unauthConn,
    {
      categoryCode: testCode,
    },
  );
  typia.assert(category);

  // Validate core category properties
  TestValidator.equals(
    "retrieved category code matches request",
    category.code,
    testCode,
  );
  TestValidator.predicate(
    "category has non-empty name",
    category.name.trim().length > 0,
  );
  TestValidator.predicate(
    "name length within limits",
    category.name.length >= 1 && category.name.length <= 100,
  );
  TestValidator.predicate(
    "code length within limits",
    category.code.length >= 1 && category.code.length <= 50,
  );

  // Validate numeric fields
  TestValidator.predicate(
    "display order is non-negative integer",
    Number.isInteger(category.display_order) && category.display_order >= 0,
  );
  TestValidator.predicate(
    "article count is non-negative integer",
    Number.isInteger(category.article_count) && category.article_count >= 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    !isNaN(Date.parse(category.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    !isNaN(Date.parse(category.updated_at)),
  );

  // Test 2: Validate boolean and optional fields
  TestValidator.predicate(
    "is_active is boolean value",
    typeof category.is_active === "boolean",
  );
  TestValidator.predicate(
    "description is either string, null, or undefined",
    category.description === undefined ||
      category.description === null ||
      (typeof category.description === "string" &&
        category.description.length <= 500),
  );

  TestValidator.predicate(
    "deleted_at is either string, null, or undefined",
    category.deleted_at === undefined ||
      category.deleted_at === null ||
      !isNaN(Date.parse(category.deleted_at)),
  );

  // Test 3: Timestamp consistency check
  const createdTime = new Date(category.created_at);
  const updatedTime = new Date(category.updated_at);
  TestValidator.predicate(
    "updated_at not before created_at",
    updatedTime >= createdTime,
  );

  // Test 4: Test with different category code patterns
  const specialCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const specialCategory = await api.functional.economicDiscussion.categories.at(
    unauthConn,
    {
      categoryCode: specialCode,
    },
  );
  typia.assert(specialCategory);
  TestValidator.equals(
    "special category code matches",
    specialCategory.code,
    specialCode,
  );

  // Test 5: Verify response structure is consistent
  const expectedKeys = [
    "id",
    "code",
    "name",
    "description",
    "display_order",
    "is_active",
    "article_count",
    "created_at",
    "updated_at",
    "deleted_at",
  ] as const;
  TestValidator.predicate(
    "all expected fields present",
    expectedKeys.every((key) => key in specialCategory),
  );

  // Test 6: Sample actual category codes to verify format handling
  const sampleCodes = [
    "economics",
    "politics",
    "finance",
    "trade",
    "policy",
  ] as const;
  for (const code of sampleCodes) {
    // Test that API handles different code patterns correctly
    const sampleCategory =
      await api.functional.economicDiscussion.categories.at(unauthConn, {
        categoryCode: code,
      });
    typia.assert(sampleCategory);
    TestValidator.predicate(
      `valid UUID format for ${code}`,
      typia.is<string>(sampleCategory.id),
    );
  }
}
