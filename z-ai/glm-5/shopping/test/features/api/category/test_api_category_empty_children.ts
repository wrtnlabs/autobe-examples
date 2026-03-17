import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test viewing a top-level category that has no subcategories.
 * Validates that categories without subcategories return empty children array
 * and are properly browsable by customers.
 */
export async function test_api_category_empty_children(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create standalone top-level category without subcategories
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(category);
  // 3. Retrieve category via public endpoint
  const retrieved = await api.functional.shoppingMall.categories.at(
    connection,
    {
      categoryId: category.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate category details
  TestValidator.equals("category id", retrieved.id, category.id);
  TestValidator.equals("category name", retrieved.name, category.name);
  TestValidator.equals(
    "category description",
    retrieved.description,
    category.description,
  );
  // 5. Validate top-level category (parent is null)
  TestValidator.equals("parent is null", retrieved.parent, null);
  // 6. Validate empty children array
  TestValidator.equals("children is empty", retrieved.children.length, 0);
  // 7. Test 404 for non-existent category
  await TestValidator.httpError(
    "non-existent category returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
