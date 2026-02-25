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
 * Test retrieving a top-level category (parent_id is null) from the e-commerce platform.
 *
 * This test verifies that:
 * 1. An administrator can create a top-level category (no parent)
 * 2. The category can be retrieved by public users without authentication
 * 3. The response contains correct category structure with null parent
 */
export async function test_api_category_top_level_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication - create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a top-level category (parentId is null/undefined)
  const categoryName = RandomGenerator.name();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const createdCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
          parentId: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  // 3. Public access - retrieve category without authentication
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedCategory = await api.functional.shoppingMall.categories.at(
    publicConnection,
    {
      categoryId: createdCategory.id,
    },
  );
  typia.assert(retrievedCategory);
  // 4. Validate top-level category properties
  TestValidator.equals("category id", retrievedCategory.id, createdCategory.id);
  TestValidator.equals("category name", retrievedCategory.name, categoryName);
  TestValidator.equals(
    "category description",
    retrievedCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "parent is null for top-level",
    retrievedCategory.parent,
    null,
  );
}
