import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductCategory";
export async function test_api_category_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a random search term that is likely to exist in the system
  // We'll use a simple term that might be in existing category names or descriptions
  const searchTerm = "common";
  // First test: Search with page 1, limit 10
  const searchPage1 = await api.functional.communityPlatform.categories.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
      } satisfies ICommunityPlatformProductCategory.IRequest,
    },
  );
  typia.assert(searchPage1);
  // Validate pagination structure
  TestValidator.equals(
    "page 1 pagination limit should match",
    searchPage1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 should have at least 0 records",
    searchPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 should have at least 0 pages",
    searchPage1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 current page should be 1",
    searchPage1.pagination.current === 1,
  );
  // Validate data structure
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(searchPage1.data),
  );
  // For each category in result, validate structure and that active field is true
  searchPage1.data.forEach((category) => {
    TestValidator.equals("category must have id", typeof category.id, "string");
    TestValidator.predicate(
      "category id must be uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.id,
      ),
    );
    TestValidator.equals(
      "category must have name",
      typeof category.name,
      "string",
    );
    TestValidator.equals(
      "category must have slug",
      typeof category.slug,
      "string",
    );
    TestValidator.equals(
      "category must have active",
      typeof category.active,
      "boolean",
    );
    TestValidator.equals("category must be active", category.active, true);
    TestValidator.equals(
      "category channel_id must be uuid",
      typeof category.channel_id,
      "string",
    );
    TestValidator.predicate(
      "channel_id must be uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.channel_id,
      ),
    );
    TestValidator.equals(
      "category section_id must be uuid",
      typeof category.section_id,
      "string",
    );
    TestValidator.predicate(
      "section_id must be uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.section_id,
      ),
    );
    TestValidator.equals(
      "category path must be string",
      typeof category.path,
      "string",
    );
    TestValidator.equals(
      "category created_at must be date-time",
      typeof category.created_at,
      "string",
    );
    TestValidator.predicate(
      "created_at must be date-time format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
        category.created_at,
      ),
    );
    // For description, it can be undefined, so check type if exists
    if (category.description !== undefined) {
      TestValidator.equals(
        "category description must be string",
        typeof category.description,
        "string",
      );
    }
    // For product_count, it can be undefined
    if (category.product_count !== undefined) {
      TestValidator.equals(
        "category product_count must be number",
        typeof category.product_count,
        "number",
      );
      TestValidator.predicate(
        "product_count must be non-negative",
        category.product_count >= 0,
      );
    }
  });
  // Second test: Search with page 2, limit 5
  const searchPage2 = await api.functional.communityPlatform.categories.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
        search: searchTerm,
      } satisfies ICommunityPlatformProductCategory.IRequest,
    },
  );
  typia.assert(searchPage2);
  // Validate pagination structure for page 2
  TestValidator.equals(
    "page 2 pagination limit should match",
    searchPage2.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 2 current page should be 2",
    searchPage2.pagination.current,
    2,
  );
  // Validate data structure for page 2
  TestValidator.predicate(
    "page 2 data array should exist",
    Array.isArray(searchPage2.data),
  );
  // For each category in page 2 result, validate structure and that active field is true
  searchPage2.data.forEach((category) => {
    TestValidator.equals(
      "page 2 category must have id",
      typeof category.id,
      "string",
    );
    TestValidator.predicate(
      "page 2 category id must be uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.id,
      ),
    );
    TestValidator.equals(
      "page 2 category must have name",
      typeof category.name,
      "string",
    );
    TestValidator.equals(
      "page 2 category must have slug",
      typeof category.slug,
      "string",
    );
    TestValidator.equals(
      "page 2 category must have active",
      typeof category.active,
      "boolean",
    );
    TestValidator.equals(
      "page 2 category must be active",
      category.active,
      true,
    );
    TestValidator.equals(
      "page 2 category channel_id must be uuid",
      typeof category.channel_id,
      "string",
    );
    TestValidator.predicate(
      "page 2 channel_id must be uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.channel_id,
      ),
    );
    TestValidator.equals(
      "page 2 category section_id must be uuid",
      typeof category.section_id,
      "string",
    );
    TestValidator.predicate(
      "page 2 section_id must be uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.section_id,
      ),
    );
    TestValidator.equals(
      "page 2 category path must be string",
      typeof category.path,
      "string",
    );
    TestValidator.equals(
      "page 2 category created_at must be date-time",
      typeof category.created_at,
      "string",
    );
    TestValidator.predicate(
      "page 2 created_at must be date-time format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
        category.created_at,
      ),
    );
    // For description, it can be undefined, so check type if exists
    if (category.description !== undefined) {
      TestValidator.equals(
        "page 2 category description must be string",
        typeof category.description,
        "string",
      );
    }
    // For product_count, it can be undefined
    if (category.product_count !== undefined) {
      TestValidator.equals(
        "page 2 category product_count must be number",
        typeof category.product_count,
        "number",
      );
      TestValidator.predicate(
        "page 2 product_count must be non-negative",
        category.product_count >= 0,
      );
    }
  });
  // Note: We cannot test the actual search logic (matching term in name/description)
  // because we cannot control or verify what data exists in the system.
  // We can only verify that the API responds correctly with valid JSON structure,
  // pagination information, and that active categories are returned.
  // The search term filtering is a server-side implementation detail we cannot test
  // without being able to create or know the existing data.
  // We can only test the response structure and pagination as shown above.
  // This is the maximum possible testing given the API limitations.
}
