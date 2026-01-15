import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
export async function test_api_category_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a base connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Create test categories via API - we cannot generate them locally in E2E test
  // Create at least 10 categories for meaningful pagination test
  const categoryCount = 15;
  const createdCategories: IShoppingMallCategory.ISummary[] = [];
  for (let i = 0; i < categoryCount; i++) {
    const categoryData: IShoppingMallCategory.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      slug: RandomGenerator.alphaNumeric(10),
      parent_id: typia.random<string & tags.Format<"uuid">>(),
      level: typia.random<number & tags.Type<"int32">>() + 1,
      order: typia.random<number & tags.Type<"int32">>(),
      is_active: RandomGenerator.pick([true, false]),
      created_at: new Date(
        Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30,
      ).toISOString(), // Random date within last 30 days
    };
    // This is a placeholder - in reality we would need to create categories via API
    // But the provided API only has a pagination endpoint, not a creation endpoint
    // Therefore, we must rely on existing data in the system
    // Since we cannot create categories with the provided API endpoints,
    // we must test against existing data in the system
    createdCategories.push(categoryData);
  }
  // Sort categories by created_at in descending order for comparison
  // We need to make sure we're testing the actual API response
  const sortedCategories = [...createdCategories].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  // Prepare pagination and sorting request
  const request: IShoppingMallCategory.IRequest = {
    order_by: "created_at",
    order_dir: "desc",
    page: 2,
    limit: 10,
  };
  // Call the API to get categories with pagination and sorting
  const response: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(adminConnection, {
      body: request,
    });
  // Validate response structure using typia.assert - this is sufficient
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  // Validate that we have data in the response
  TestValidator.predicate("response has data", response.data.length > 0);
  // Validate sorting order is correct (created_at descending)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at);
      const next = new Date(response.data[i + 1].created_at);
      // Verify the sort order is descending by created_at
      TestValidator.predicate(
        "sorted by created_at descending",
        current >= next,
      );
    }
  }
  // Validate each category in the response has the expected structure
  for (const category of response.data) {
    // Verify required fields are present
    TestValidator.predicate("category has valid id", category.id.length > 0);
    TestValidator.predicate(
      "category has valid name",
      category.name.length > 0,
    );
    TestValidator.predicate(
      "category has valid slug",
      category.slug.length > 0,
    );
    TestValidator.predicate(
      "category has valid parent_id",
      category.parent_id.length > 0,
    );
    TestValidator.predicate("category has valid level", category.level >= 1);
    TestValidator.predicate("category has valid order", category.order >= 0);
    TestValidator.predicate(
      "category has valid is_active",
      typeof category.is_active === "boolean",
    );
    TestValidator.predicate(
      "category has valid created_at",
      category.created_at.length > 0,
    );
    // Verify format of date-time
    TestValidator.predicate(
      "created_at is ISO format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        category.created_at,
      ),
    );
  }
}
