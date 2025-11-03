import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";

/**
 * Validate admin creation of a unique category tree (taxonomy root).
 *
 * 1. Sign up a new admin using valid, unique credentials and "super" role with
 *    "active" status.
 * 2. Prepare unique category tree data with unique code, display name, and an
 *    optional description.
 * 3. Use category tree creation endpoint as an authenticated admin.
 * 4. Assert the response: returned tree_code and tree_name match input, response
 *    includes valid id and audit timestamps, and the tree is ready for further
 *    category assignments.
 */
export async function test_api_admin_category_tree_creation_unique_code(
  connection: api.IConnection,
) {
  // 1. Admin sign-up
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      role: "super",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Prepare unique category tree data
  const tree_code = `auto_${RandomGenerator.alphaNumeric(12)}`;
  const tree_name = RandomGenerator.paragraph({ sentences: 2 });
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const reqBody = {
    tree_code,
    tree_name,
    description,
  } satisfies IShoppingCategoryTree.ICreate;

  // 3. Create category tree
  const tree = await api.functional.shopping.admin.categoryTrees.create(
    connection,
    {
      body: reqBody,
    },
  );
  typia.assert(tree);

  // 4. Response assertions
  TestValidator.equals("category tree code matches", tree.tree_code, tree_code);
  TestValidator.equals("category tree name matches", tree.tree_name, tree_name);
  TestValidator.equals(
    "category tree description matches",
    tree.description,
    description,
  );
  TestValidator.predicate(
    "category tree id should be uuid",
    typeof tree.id === "string" && /[0-9a-fA-F-]{36}/.test(tree.id),
  );
  TestValidator.predicate(
    "category tree has created_at",
    typeof tree.created_at === "string" && tree.created_at.length > 0,
  );
  TestValidator.predicate(
    "category tree has updated_at",
    typeof tree.updated_at === "string" && tree.updated_at.length > 0,
  );
  TestValidator.equals("category tree not deleted", tree.deleted_at, null);
}
