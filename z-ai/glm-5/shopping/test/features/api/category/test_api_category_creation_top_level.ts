import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test creating a top-level category as an administrator.
 *
 * Steps:
 * 1. Administrator authenticates via join endpoint
 * 2. Administrator creates a new top-level category with name and description (parentId omitted or null)
 * 3. Verify the response contains the created category with all fields: id (UUID), name, description, parent (null), children (empty array), createdAt, updatedAt
 * 4. Verify the category data is stored correctly
 *
 * Business validations:
 * - Category name is stored correctly
 * - Description is stored correctly (optional field)
 * - Parent is null for top-level category
 * - Children array is empty (no subcategories yet)
 * - Timestamps are generated correctly
 * - UUID is generated and returned
 */
export async function test_api_category_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication - create new connection for admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create top-level category (parentId omitted for top-level)
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: categoryName,
        description: categoryDescription,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Verify category response structure
  TestValidator.equals("category name", category.name, categoryName);
  TestValidator.equals(
    "category description",
    category.description,
    categoryDescription,
  );
  TestValidator.equals("parent is null", category.parent, null);
  TestValidator.equals("children is empty", category.children.length, 0);
}
