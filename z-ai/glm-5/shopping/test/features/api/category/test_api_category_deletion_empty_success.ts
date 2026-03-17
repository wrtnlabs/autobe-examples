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
 * Test successful deletion of an empty top-level category.
 *
 * Verifies that an administrator can successfully delete a category that has no
 * products and no subcategories. The deletion is a soft delete (deleted_at is set).
 *
 * Workflow:
 * 1. Administrator authentication via join
 * 2. Create top-level category
 * 3. Delete the category
 * 4. Verify deletion completes successfully (no error thrown)
 */
export async function test_api_category_deletion_empty_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // Step 2: Create a top-level category with unique name
  const categoryName = `TestCategory_${RandomGenerator.alphaNumeric(8)}`;
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: categoryName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // Step 3: Delete the empty category (soft delete)
  await api.functional.shoppingMall.administrator.categories.erase(
    adminConnection,
    {
      categoryId: category.id,
    },
  );
  // Step 4: Verification - successful deletion is implicit (no error thrown)
  // The erase endpoint returns void, so no response to validate
  // In a real scenario, you would verify the category is no longer
  // visible in category listings, but no listing endpoint is available
}
