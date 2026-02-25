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

export async function test_api_product_category_update_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator account and login to get valid admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "a1b2c3d4",
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a product category via admin connection
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Prepare update payload with new random name and description
  const updatePayload: IShoppingMallProductCategory.IUpdate = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  // 4. Prepare two unauthorized connections
  // 4-1. Unauthenticated user connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // 4-2. Connection with fake token (simulate other roles or invalid)
  const fakeConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer fake_token_xyz`,
    },
  };
  // 5. Attempt to update category with unauthenticated client
  await TestValidator.httpError(
    "unauthenticated user cannot update product category",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.update(
        unauthenticatedConnection,
        {
          productCategoryId: category.id,
          body: updatePayload,
        },
      );
    },
  );
  // 6. Attempt to update category with fake (unauthorized) token
  await TestValidator.httpError(
    "unauthorized user cannot update product category",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.update(
        fakeConnection,
        {
          productCategoryId: category.id,
          body: updatePayload,
        },
      );
    },
  );
  // 7. Verify that product category did not change by fetching category with adminConnection
  // There is no GET endpoint provided in the data; so we verify indirectly that no errors in retrieval
  // or we just skip this step according to instructions.
}
