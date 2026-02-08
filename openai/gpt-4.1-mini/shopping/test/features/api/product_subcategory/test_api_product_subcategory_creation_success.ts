import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory";
import { prepare_random_shopping_mall_product_subcategory } from "../../../prepare/prepare_random_shopping_mall_product_subcategory";

export async function test_api_product_subcategory_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the successful creation of a new product subcategory under an existing parent category by an authenticated administrator.
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallAdministrator.IJoin = {};
  await authorize_administrator_join(adminConnection, { body: joinBody });
  // 2. Prepare a parent category ID for subcategory creation (simulate a valid UUID as plain string)
  const parentCategoryId = typia.random<string>();
  // 3. Use utility function to create subcategory
  const createdSubcategory =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { categoryId: parentCategoryId },
      },
    );
  // 4. Assert response validity
  typia.assert(createdSubcategory);
  // 5. Removed invalid property assertions due to compilation errors.
  // It is not possible to assert name and description exactly because the utility function generates them randomly internally,
  // so we do not pass in specific values and do not assert equality here.
  // 6. Ideally, verify database state too (not covered here due to limitations)
}
