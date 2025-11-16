import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test building a deep category hierarchy with multiple nesting levels.
 *
 * This test validates the system's ability to support unlimited category
 * nesting depth by creating a multi-level hierarchical structure. Starting with
 * a root category, the test progressively creates child categories at
 * increasing depths (child, grandchild, great-grandchild) to verify that
 * hierarchical relationships are correctly maintained throughout the tree
 * structure.
 *
 * The test ensures that each category correctly references its parent and that
 * the parent_id foreign key relationships enable proper tree navigation. This
 * validates the system's capability to support complex product taxonomies with
 * sophisticated organization suitable for large-scale e-commerce catalogs.
 *
 * Test Steps:
 *
 * 1. Authenticate as admin to gain category management permissions
 * 2. Create root category (level 0 - no parent)
 * 3. Create child category with root as parent (level 1)
 * 4. Create grandchild category with child as parent (level 2)
 * 5. Create great-grandchild category with grandchild as parent (level 3)
 * 6. Validate parent-child relationships at each level
 * 7. Verify hierarchical integrity across the entire tree
 */
export async function test_api_category_creation_multi_level_hierarchy(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin" as const,
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create root category (level 0 - no parent)
  const rootCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: "Electronics",
        slug: `electronics-${typia.random<number & tags.Type<"uint32">>()}`,
        description: "Root level category for all electronic products",
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(rootCategory);
  TestValidator.equals(
    "root category has no parent",
    rootCategory.parent_id,
    null,
  );

  // Step 3: Create child category (level 1)
  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: rootCategory.id,
        name: "Computers",
        slug: `computers-${typia.random<number & tags.Type<"uint32">>()}`,
        description: "Computer products under Electronics",
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childCategory);
  TestValidator.equals(
    "child category parent_id matches root",
    childCategory.parent_id,
    rootCategory.id,
  );

  // Step 4: Create grandchild category (level 2)
  const grandchildCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: childCategory.id,
        name: "Laptops",
        slug: `laptops-${typia.random<number & tags.Type<"uint32">>()}`,
        description: "Laptop computers under Computers category",
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(grandchildCategory);
  TestValidator.equals(
    "grandchild category parent_id matches child",
    grandchildCategory.parent_id,
    childCategory.id,
  );

  // Step 5: Create great-grandchild category (level 3)
  const greatGrandchildCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: grandchildCategory.id,
        name: "Gaming Laptops",
        slug: `gaming-laptops-${typia.random<number & tags.Type<"uint32">>()}`,
        description: "High-performance gaming laptops",
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(greatGrandchildCategory);
  TestValidator.equals(
    "great-grandchild category parent_id matches grandchild",
    greatGrandchildCategory.parent_id,
    grandchildCategory.id,
  );

  // Step 6: Verify hierarchical integrity
  TestValidator.predicate(
    "root category is at top level",
    rootCategory.parent_id === null,
  );
  TestValidator.predicate(
    "child references root",
    childCategory.parent_id === rootCategory.id,
  );
  TestValidator.predicate(
    "grandchild references child",
    grandchildCategory.parent_id === childCategory.id,
  );
  TestValidator.predicate(
    "great-grandchild references grandchild",
    greatGrandchildCategory.parent_id === grandchildCategory.id,
  );

  // Validate all categories have proper initialization
  TestValidator.predicate(
    "root category has zero products initially",
    rootCategory.product_count === 0,
  );
  TestValidator.predicate(
    "child category has zero products initially",
    childCategory.product_count === 0,
  );
  TestValidator.predicate(
    "grandchild category has zero products initially",
    grandchildCategory.product_count === 0,
  );
  TestValidator.predicate(
    "great-grandchild category has zero products initially",
    greatGrandchildCategory.product_count === 0,
  );
}
