import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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
 * Test the primary success path for category deletion where an administrator
 * deletes an empty category with no products and no subcategories.
 *
 * Steps:
 * 1. Authenticate as an administrator via join utility function
 * 2. Create a new category using the generate utility function
 * 3. Delete the newly created empty category via the erase API
 * 4. Verify the deletion succeeds without errors (204 No Content response)
 *
 * Validation points:
 * - Administrator can successfully authenticate
 * - Category creation succeeds for test preparation
 * - Empty category deletion completes successfully
 * - The erase operation returns void (no content) as expected
 */
export async function test_api_category_deletion_empty_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a test category (empty category with no products)
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(category);
  // 3. Delete the empty category - should succeed with 204 No Content
  await api.functional.shoppingMall.administrator.categories.erase(
    adminConnection,
    {
      categoryId: category.id,
    },
  );
  // 4. Verify deletion - attempting to get the deleted category should return 404
  await TestValidator.httpError(
    "deleted category should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.categories.erase(
        adminConnection,
        {
          categoryId: category.id,
        },
      );
    },
  );
}
