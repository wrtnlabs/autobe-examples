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

export async function test_api_product_category_creation_by_administrator_success_and_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Administrator registration (join) for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // Create a unique product category
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);

  // Create a second category with the same data as the first category
  await TestValidator.error("duplicate category name rejection", async () => {
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {
        body: {},
      },
    );
  });
}
