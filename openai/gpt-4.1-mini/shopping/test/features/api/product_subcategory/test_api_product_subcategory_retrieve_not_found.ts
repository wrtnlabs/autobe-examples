import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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

export async function test_api_product_subcategory_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  /*
    Scenario 3: Fail to retrieve product subcategory when subcategoryId does not exist.
  
    Steps:
    - Authenticate as an administrator by joining the system.
    - Create a valid product category.
    - Attempt to retrieve a subcategory using a non-existent subcategoryId within the created categoryId.
  
    Validation:
    - Verify HTTP 404 Not Found status.
    - Validate error message indicates that the product subcategory was not found.
  
    Edge cases:
    - Handling of resource not found scenarios with proper error reporting.
    */
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a valid product category
  const categoryRaw =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  const category = typia.assert<(string & tags.Format<"uuid">)>((categoryRaw as any).categoryId ?? (categoryRaw as any).id ?? "");
  // 3. Attempt to retrieve a non-existent subcategory
  const fakeSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt API call and expect 404 error
  await TestValidator.httpError(
    "product subcategory not found",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.product.categories.subcategories.at(
        adminConnection,
        {
          categoryId: category,
          subcategoryId: fakeSubcategoryId,
        },
      );
    },
  );
}
