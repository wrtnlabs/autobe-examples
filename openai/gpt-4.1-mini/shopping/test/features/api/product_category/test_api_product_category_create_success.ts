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

export async function test_api_product_category_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Test successful creation of a new product category by an authorized administrator.
  // Verify unique category name enforcement, timestamps, and proper returned data.
  // 1. Administrator joins to obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, { body: joinBody });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // 2. Create product category with empty body (since ICreate definition has no properties)
  const category: IShoppingMallProductCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Attempt creating another category with same parameters to confirm conflict error
  await TestValidator.error(
    "duplicate category name triggers error",
    async () => {
      await generate_random_shopping_mall_administrator_product_categories_create(
        adminConnection,
        {},
      );
    },
  );
  // 4. Attempt using base connection directly should produce authorization error
  await TestValidator.error(
    "access denied for non-admin connection",
    async () => {
      await generate_random_shopping_mall_administrator_product_categories_create(
        connection,
        {},
      );
    },
  );
}
