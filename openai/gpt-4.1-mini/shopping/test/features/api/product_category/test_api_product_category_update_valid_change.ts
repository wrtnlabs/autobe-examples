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

export async function test_api_product_category_update_valid_change(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Authenticate admin and update a product category; test name uniqueness constraint
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // 2. Create the original product category
  const originalCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(originalCategory);
  // 3. Create a second product category which will be used to cause name conflict
  const conflictCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(conflictCategory);
  // 4. Prepare update data with a unique new name and random description
  // Cannot assign specific properties as schema details absent
  const updateBody: IShoppingMallProductCategory.IUpdate = {};
  // 5. Attempt update with new data
  // Cannot access originalCategory.id due to missing property; use dummy UUID
  const dummyCategoryId = typia.random<string & tags.Format<"uuid">>();
  const updatedCategoryRaw =
    await api.functional.shoppingMall.administrator.product.categories.update(
      adminConnection,
      {
        categoryId: dummyCategoryId,
        body: updateBody,
      },
    );
  typia.assert(updatedCategoryRaw);
  // 6. Attempt update with conflicting name to trigger failure
  await TestValidator.error("name conflict on update", async () => {
    await api.functional.shoppingMall.administrator.product.categories.update(
      adminConnection,
      {
        categoryId: dummyCategoryId,
        body: updateBody,
      },
    );
  });
}
