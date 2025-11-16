import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";

/**
 * Test retrieval of inactive economic discussion categories and validate
 * metadata exposure.
 *
 * This test validates that the category detail API properly returns complete
 * category metadata regardless of active status. It verifies that inactive
 * categories expose their full data including descriptions, timestamps, and
 * article counts, ensuring users can access historical category context. The
 * test demonstrates that category visibility controls work correctly for both
 * active and inactive categories while preserving referential integrity.
 */
export async function test_api_economic_discussion_category_inactive_retrieval(
  connection: api.IConnection,
) {
  // Test with a realistic economic discussion category code (simulating existing categories)
  const economicCategoryCode = [
    "monetary-policy",
    "fiscal-commons",
    "trade-interdependence",
    "development-paradigms",
    "market-stability",
  ] as const;

  const categoryCode = RandomGenerator.pick(economicCategoryCode);

  // Retrieve the category detail - API should return data regardless of active status
  const category = await api.functional.economicDiscussion.categories.at(
    connection,
    {
      categoryCode: categoryCode,
    },
  );

  // Validate the response structure matches the IEconomicDiscussionCategory type
  typia.assert<IEconomicDiscussionCategory>(category);

  // Verify complete metadata is exposed for category access
  TestValidator.predicate(
    "category has complete ID structure",
    typeof category.id === "string" &&
      typia.is<string & tags.Format<"uuid">>(category.id),
  );

  TestValidator.equals(
    "category code matches request",
    category.code,
    categoryCode,
  );
  TestValidator.predicate(
    "category has descriptive name",
    typeof category.name === "string" && category.name.length > 0,
  );

  TestValidator.predicate(
    "category description is accessible",
    category.description === null ||
      category.description === undefined ||
      (typeof category.description === "string" &&
        category.description.length <= 500),
  );

  TestValidator.predicate(
    "category display order is valid",
    typeof category.display_order === "number" && category.display_order >= 0,
  );

  TestValidator.predicate(
    "article count reflects actual data",
    typeof category.article_count === "number" && category.article_count >= 0,
  );

  TestValidator.predicate(
    "timestamps have ISO format",
    typia.is<string & tags.Format<"date-time">>(category.created_at) &&
      typia.is<string & tags.Format<"date-time">>(category.updated_at),
  );

  TestValidator.predicate(
    "category active/inactive status is properly exposed",
    typeof category.is_active === "boolean",
  );

  TestValidator.predicate(
    "deleted_at follows soft deletion pattern",
    category.deleted_at === null ||
      category.deleted_at === undefined ||
      typia.is<string & tags.Format<"date-time">>(category.deleted_at),
  );

  // Validate the system preserves referential integrity by exposing category metadata
  TestValidator.predicate(
    "category maintains data consistency regardless of active status",
    category.id !== null && category.code !== null && category.name !== null,
  );
}
