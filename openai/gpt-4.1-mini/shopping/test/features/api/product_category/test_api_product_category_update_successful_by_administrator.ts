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

export async function test_api_product_category_update_successful_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${administrator.token.access}`,
  };
  // 2. Create initial product category for update
  const createdCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(createdCategory);
  // 3. Prepare update payload
  const updatePayload: IShoppingMallProductCategory.IUpdate = {
    name: `${RandomGenerator.name(2)}-updated`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  // 4. Perform update
  const updatedCategory =
    await api.functional.shoppingMall.administrator.productCategories.update(
      adminConnection,
      {
        productCategoryId: createdCategory.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedCategory);
  // 5. Assertions
  TestValidator.equals(
    "updated name",
    updatedCategory.name,
    updatePayload.name,
  );
  TestValidator.equals(
    "updated description",
    updatedCategory.description,
    updatePayload.description,
  );
  TestValidator.equals(
    "category id unchanged",
    updatedCategory.id,
    createdCategory.id,
  );
  TestValidator.predicate(
    "valid UUID format",
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(updatedCategory.id),
  );
}
