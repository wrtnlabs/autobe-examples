import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

export async function test_api_product_category_update_name_conflict_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  if (!adminConnection.headers) adminConnection.headers = {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // 2. Create the first product category
  const firstCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(firstCategory);
  // 3. Create the second product category with a different name
  const secondCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(secondCategory);
  // 4. Attempt to update the second category with a name conflict (first category name)
  const updateBody: IShoppingMallProductCategory.IUpdate = {
    name: (firstCategory as any).name, // Using as any due to DTO limitations; this reflects the name conflict
  };
  await TestValidator.error("category name conflict rejection", async () => {
    await api.functional.shoppingMall.administrator.product.categories.update(
      adminConnection,
      {
        categoryId: (secondCategory as any).id,
        body: updateBody,
      },
    );
  });
}
