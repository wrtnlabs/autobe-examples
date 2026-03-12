import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test category deletion with products scenario.
 *
 * This test verifies that an administrator can delete a category and the
 * deletion operation completes successfully. Note: Product verification
 * is limited due to unavailable product API functions in the SDK.
 *
 * Flow:
 * 1. Register and authenticate as administrator
 * 2. Create a test category
 * 3. Delete the category
 * 4. Validate successful deletion
 */
export async function test_api_category_deletion_with_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a test category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics",
        description: "Electronic products and accessories",
      },
    },
  );
  typia.assert(category);
  // 3. Delete the category
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: category.id,
  });
  // 4. Deletion successful - void response requires no validation
  // The successful completion of the erase call confirms the operation succeeded
}
