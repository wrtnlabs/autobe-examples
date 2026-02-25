import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_create";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";

export async function test_api_administrator_product_category_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and create authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create a new product category using utility function
  const createdCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(createdCategory);
  // 3. Delete the newly created product category
  await api.functional.shoppingMall.administrator.productCategories.erase(
    adminConnection,
    {
      productCategoryId: createdCategory.id,
    },
  );
  // 4. Verify deletion by trying to delete again: should get 404 error
  await TestValidator.httpError(
    "delete non-existent category",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.erase(
        adminConnection,
        {
          productCategoryId: createdCategory.id,
        },
      );
    },
  );
  // 5. Verify unauthorized deletion is rejected
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized deletion forbidden",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.erase(
        unauthorizedConnection,
        {
          productCategoryId: createdCategory.id,
        },
      );
    },
  );
  // Note: Confirming that products previously assigned to the deleted category are reassigned to uncategorized state and audit logs
  // are internal processes assumed to be verified by integration/system tests or DB verification tools.
}
