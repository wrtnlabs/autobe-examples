import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_browsing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call the category browsing endpoint with minimal/default parameters
  const response = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformCategory.IRequest,
    },
  );
  // Complete runtime validation of response structure and types
  typia.assert(response);
  // Validate pagination metadata consistency
  TestValidator.equals(
    "pagination current should be 1 by default",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive number",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array length matches pagination expectations
  TestValidator.equals(
    "data length should be <= limit",
    response.data.length <= response.pagination.limit,
    true,
  );
  // Validate each category in the response
  for (const category of response.data) {
    // Each category should have all required ISummary fields
    TestValidator.predicate(
      "category id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.id,
      ),
    );
    TestValidator.predicate(
      "category name is non-empty string",
      typeof category.name === "string" && category.name.length > 0,
    );
    TestValidator.predicate(
      "category description is string",
      typeof category.description === "string",
    );
    TestValidator.predicate(
      "category slug is non-empty string",
      typeof category.slug === "string" && category.slug.length > 0,
    );
    TestValidator.predicate(
      "category display_order is integer",
      Number.isInteger(category.display_order),
    );
    // Validate business rule: only active categories should be returned by default
    TestValidator.equals(
      "category should be active by default",
      category.is_active,
      true,
    );
    TestValidator.predicate(
      "category is_featured is boolean",
      typeof category.is_featured === "boolean",
    );
    // icon_url can be null or string
    TestValidator.predicate(
      "category icon_url is string or null",
      category.icon_url === null || typeof category.icon_url === "string",
    );
  }
  // Validate sorting by display_order (ascending)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        "categories sorted by display_order ascending",
        response.data[i - 1].display_order <= response.data[i].display_order,
      );
      // If display_order ties, they should be sorted by creation date (not directly testable)
      // We can only validate the primary sort key
      if (
        response.data[i - 1].display_order === response.data[i].display_order
      ) {
        // Secondary sort by creation date cannot be validated without the field
      }
    }
  }
}
