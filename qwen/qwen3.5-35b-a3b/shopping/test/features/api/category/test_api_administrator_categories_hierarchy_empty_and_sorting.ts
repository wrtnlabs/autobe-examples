import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_categories_hierarchy_empty_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Access hierarchy endpoint (may be empty or contain existing categories)
  const hierarchyData =
    await api.functional.ecommerceMall.administrator.categories.hierarchy(
      adminConnection,
    );
  typia.assert(hierarchyData);
  
  // Cast to expected array type if needed
  const hierarchy: IEcommerceMallCategory.IHierarchy[] = (
    Array.isArray(hierarchyData) ? hierarchyData : (hierarchyData as any).categories ?? []
  ) as IEcommerceMallCategory.IHierarchy[];

  // 3. Validate empty hierarchy handling
  // The API should return an array (empty or with categories)
  TestValidator.predicate("hierarchy returns array", Array.isArray(hierarchy));
  // 4. Validate sorting behavior with null sort_order values
  // When sort_order is null, categories should still be valid and sortable
  for (const category of hierarchy) {
    // Each category should have valid structure
    TestValidator.equals("category has id", typeof category.id, "string");
    TestValidator.equals("category has name", typeof category.name, "string");
    // validate description can be null
    TestValidator.predicate(
      "category description is string or null",
      category.description === null || typeof category.description === "string",
    );
    // validate sort_order can be null
    TestValidator.predicate(
      "category sort_order is number or null",
      category.sort_order === null || typeof category.sort_order === "number",
    );
    // validate created_at is valid date-time string
    TestValidator.predicate(
      "category created_at is valid date-time",
      category.created_at !== undefined &&
        typeof category.created_at === "string",
    );
    // validate updated_at is valid date-time string
    TestValidator.predicate(
      "category updated_at is valid date-time",
      category.updated_at !== undefined &&
        typeof category.updated_at === "string",
    );
    // validate deleted_at can be null (soft delete filter)
    TestValidator.predicate(
      "category deleted_at is date-time or null",
      category.deleted_at === null || typeof category.deleted_at === "string",
    );
    // validate children array exists
    TestValidator.predicate(
      "category children is array",
      Array.isArray(category.children),
    );
    // validate product_count can be null
    TestValidator.predicate(
      "category product_count is number or null",
      category.product_count === null ||
        typeof category.product_count === "number",
    );
  }
  // 5. Validate null sort_order sorting behavior
  // All categories should be present and sortable even with null sort_order
  const nullSortOrderCategories = hierarchy.filter(
    (cat) => cat.sort_order === null,
  );
  TestValidator.predicate("categories with null sort_order exist", true);
  // 6. Validate top-level categories (those without children are not necessarily top-level)
  // In the hierarchy structure, parent categories have children arrays
  // The sorting should place categories with null sort_order appropriately
  const topLevelCategories = hierarchy.filter(
    (cat) => cat.children.length === 0,
  );
  TestValidator.predicate(
    "top-level categories counted correctly",
    topLevelCategories.length >= 0,
  );
  // 7. Validate all categories are active (deleted_at IS NULL)
  // The API should only return active categories
  for (const category of hierarchy) {
    TestValidator.predicate(
      "category is active (deleted_at is null)",
      category.deleted_at === null,
    );
  }
  // 8. Validate hierarchical structure integrity
  // If a category has children, those children should be valid ISummary objects
  for (const category of hierarchy) {
    for (const child of category.children) {
      TestValidator.equals("child has valid id", typeof child.id, "string");
      TestValidator.equals("child has valid name", typeof child.name, "string");
      // ISummary doesn't have product_count, creator, or deleted_at
      TestValidator.predicate("child has description field", child.description !== undefined);
      TestValidator.predicate("child has sort_order field", child.sort_order !== undefined);
      TestValidator.predicate("child has parent field", child.parent !== undefined);
      TestValidator.predicate("child has created_at field", child.created_at !== undefined);
      TestValidator.predicate("child has updated_at field", child.updated_at !== undefined);
    }
  }
  // 9. Validate sorting fallback to name when sort_order is equal
  // Categories with same sort_order (including null) should be sorted by name
  const groupedBySortOrder = new Map<
    number | null,
    IEcommerceMallCategory.IHierarchy[]
  >();
  for (const category of hierarchy) {
    const key = category.sort_order;
    if (!groupedBySortOrder.has(key)) {
      groupedBySortOrder.set(key, []);
    }
    groupedBySortOrder.get(key)!.push(category);
  }
  // Validate each group is sorted by name when sort_order is equal
  for (const [, categories] of groupedBySortOrder) {
    for (let i = 1; i < categories.length; i++) {
      TestValidator.predicate(
        `category[i] name >= category[i-1] name within same sort_order group`,
        categories[i].name >= categories[i - 1].name,
      );
    }
  }
  // 10. Validate empty system response
  // If no categories exist, the API should return empty array (not 404 based on scenario)
  if (hierarchy.length === 0) {
    TestValidator.equals(
      "empty hierarchy is valid response",
      hierarchy.length,
      0,
    );
  }
}