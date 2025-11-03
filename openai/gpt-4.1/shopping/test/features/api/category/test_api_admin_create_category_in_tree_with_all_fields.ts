import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";

/**
 * Validate that an admin can create a new category in a category tree including
 * all fields and hierarchy rules.
 *
 * 1. Register a new admin (establish authentication)
 * 2. Create a category tree
 * 3. Add a root category (parent_id: null, all fields populated)
 * 4. Add a child category (parent_id set to root category id, all fields
 *    populated)
 * 5. Validate success, relationships, and field integrity
 */
export async function test_api_admin_create_category_in_tree_with_all_fields(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin for authentication
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick(["super", "operator", "support"]) as string,
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.equals(
    "created admin email matches input",
    admin.email,
    adminEmail,
  );
  TestValidator.equals("admin is active", admin.status, "active");

  // Step 2: Create a new category tree
  const treeCode = RandomGenerator.alphaNumeric(10).toLowerCase();
  const treeName = RandomGenerator.paragraph({ sentences: 2 });
  const treeDescription = RandomGenerator.paragraph({ sentences: 4 });
  const treeCreateBody = {
    tree_code: treeCode,
    tree_name: treeName,
    description: treeDescription,
  } satisfies IShoppingCategoryTree.ICreate;
  const catTree: IShoppingCategoryTree =
    await api.functional.shopping.admin.categoryTrees.create(connection, {
      body: treeCreateBody,
    });
  typia.assert(catTree);
  TestValidator.equals(
    "created tree code matches input",
    catTree.tree_code,
    treeCode,
  );
  TestValidator.equals(
    "created tree name matches input",
    catTree.tree_name,
    treeName,
  );
  TestValidator.equals(
    "created tree description matches input",
    catTree.description,
    treeDescription,
  );

  // Step 3: Create a root category (no parent_id, all fields filled)
  const rootCode = RandomGenerator.alphaNumeric(10).toLowerCase();
  const rootName = RandomGenerator.paragraph({ sentences: 2 });
  const rootDescription = RandomGenerator.paragraph({ sentences: 3 });
  const rootSortOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
  >();
  const rootCreateBody = {
    category_tree_id: catTree.id,
    category_code: rootCode,
    category_name: rootName,
    parent_id: null,
    sort_order: rootSortOrder,
    description: rootDescription,
  } satisfies IShoppingCategory.ICreate;
  const rootCategory: IShoppingCategory =
    await api.functional.shopping.admin.categoryTrees.categories.create(
      connection,
      {
        treeCode,
        body: rootCreateBody,
      },
    );
  typia.assert(rootCategory);
  TestValidator.equals(
    "root category assigned to correct tree",
    rootCategory.category_tree_id,
    catTree.id,
  );
  TestValidator.equals(
    "root category has null parent_id",
    rootCategory.parent_id,
    null,
  );
  TestValidator.equals(
    "root category code matches input",
    rootCategory.category_code,
    rootCode,
  );
  TestValidator.equals(
    "root category name matches input",
    rootCategory.category_name,
    rootName,
  );
  TestValidator.equals(
    "root category description matches input",
    rootCategory.description,
    rootDescription,
  );
  TestValidator.equals(
    "root category sort_order matches input",
    rootCategory.sort_order,
    rootSortOrder,
  );

  // Step 4: Create child category (set parent_id, all fields)
  const childCode = RandomGenerator.alphaNumeric(10).toLowerCase();
  const childName = RandomGenerator.paragraph({ sentences: 2 });
  const childDescription = RandomGenerator.paragraph({ sentences: 3 });
  const childSortOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
  >();
  const childCreateBody = {
    category_tree_id: catTree.id,
    category_code: childCode,
    category_name: childName,
    parent_id: rootCategory.id,
    sort_order: childSortOrder,
    description: childDescription,
  } satisfies IShoppingCategory.ICreate;
  const childCategory: IShoppingCategory =
    await api.functional.shopping.admin.categoryTrees.categories.create(
      connection,
      {
        treeCode,
        body: childCreateBody,
      },
    );
  typia.assert(childCategory);
  TestValidator.equals(
    "child category is in same tree",
    childCategory.category_tree_id,
    catTree.id,
  );
  TestValidator.equals(
    "child category's parent_id matches root",
    childCategory.parent_id,
    rootCategory.id,
  );
  TestValidator.equals(
    "child category code",
    childCategory.category_code,
    childCode,
  );
  TestValidator.equals(
    "child category name",
    childCategory.category_name,
    childName,
  );
  TestValidator.equals(
    "child category description",
    childCategory.description,
    childDescription,
  );
  TestValidator.equals(
    "child category sort_order",
    childCategory.sort_order,
    childSortOrder,
  );

  // Step 5: Attempt to create category with duplicate code and validate error
  await TestValidator.error(
    "duplicate category_code in same tree should fail",
    async () => {
      await api.functional.shopping.admin.categoryTrees.categories.create(
        connection,
        {
          treeCode,
          body: {
            category_tree_id: catTree.id,
            category_code: rootCode, // duplicate code
            category_name: RandomGenerator.paragraph({ sentences: 2 }),
            parent_id: null,
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<51> & tags.Maximum<100>
            >(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IShoppingCategory.ICreate,
        },
      );
    },
  );
}
