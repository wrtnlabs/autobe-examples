import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";

/**
 * Test that admin can create category nodes correctly, check hierarchy,
 * uniqueness, and error handling for duplicates.
 */
export async function test_api_admin_category_node_creation(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      role: RandomGenerator.pick([
        "super",
        "support",
        "operator",
        "compliance",
      ] as const),
      status: RandomGenerator.pick(["active", "pending", "suspended"] as const),
    },
  });
  typia.assert(admin);

  // 2. Create a new category tree
  const treeCode: string = RandomGenerator.alphaNumeric(8).toLowerCase();
  const treeName: string = RandomGenerator.name(2);
  const description: string = RandomGenerator.paragraph({ sentences: 8 });
  const categoryTree = await api.functional.shopping.admin.categoryTrees.create(
    connection,
    {
      body: {
        tree_code: treeCode,
        tree_name: treeName,
        description,
      },
    },
  );
  typia.assert(categoryTree);
  TestValidator.equals(
    "tree_code matches input",
    categoryTree.tree_code,
    treeCode,
  );

  // 3. Create a root category node
  const codeRoot = RandomGenerator.alphaNumeric(10).toLowerCase();
  const nameRoot = RandomGenerator.paragraph({ sentences: 3 });
  const descriptionRoot = RandomGenerator.paragraph({ sentences: 10 });
  const sortOrderRoot = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >();
  const rootCategory = await api.functional.shopping.admin.categories.create(
    connection,
    {
      body: {
        category_tree_id: categoryTree.id,
        category_code: codeRoot,
        category_name: nameRoot,
        sort_order: sortOrderRoot,
        description: descriptionRoot,
      },
    },
  );
  typia.assert(rootCategory);
  TestValidator.equals(
    "root category tree id",
    rootCategory.category_tree_id,
    categoryTree.id,
  );
  TestValidator.equals("root has no parent", rootCategory.parent_id, null);
  TestValidator.equals(
    "root category_code matches input",
    rootCategory.category_code,
    codeRoot,
  );

  // 4. Create a child (nested) category node
  const codeChild = RandomGenerator.alphaNumeric(10).toLowerCase();
  const nameChild = RandomGenerator.paragraph({ sentences: 3 });
  const descriptionChild = RandomGenerator.paragraph({ sentences: 10 });
  const sortOrderChild = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >();
  const childCategory = await api.functional.shopping.admin.categories.create(
    connection,
    {
      body: {
        category_tree_id: categoryTree.id,
        category_code: codeChild,
        category_name: nameChild,
        parent_id: rootCategory.id,
        sort_order: sortOrderChild,
        description: descriptionChild,
      },
    },
  );
  typia.assert(childCategory);
  TestValidator.equals(
    "child tree id",
    childCategory.category_tree_id,
    categoryTree.id,
  );
  TestValidator.equals(
    "child parent_id points to root",
    childCategory.parent_id,
    rootCategory.id,
  );
  TestValidator.equals(
    "child category_code matches input",
    childCategory.category_code,
    codeChild,
  );

  // 5. Attempt to create a category node with duplicate code in same tree (must error)
  await TestValidator.error(
    "duplicate category_code in same tree should fail",
    async () => {
      await api.functional.shopping.admin.categories.create(connection, {
        body: {
          category_tree_id: categoryTree.id,
          category_code: codeRoot, // intentionally duplicate
          category_name: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      });
    },
  );
}
