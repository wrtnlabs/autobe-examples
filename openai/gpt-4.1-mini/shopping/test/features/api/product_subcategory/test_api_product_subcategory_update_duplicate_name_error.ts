import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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
import { generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory";
import { prepare_random_shopping_mall_product_subcategory } from "../../../prepare/prepare_random_shopping_mall_product_subcategory";

export async function test_api_product_subcategory_update_duplicate_name_error(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      password: RandomGenerator.alphaNumeric(16),
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(adminAuth);
  // Create two subcategories under the same product category to setup duplicate name scenario
  // Note: Product category creation API is unavailable, so we assume the generated productCategoryId exists
  const productCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Creating first subcategory
  const firstSubcategory =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { productCategoryId },
        body: {
          name: "UniqueSubcategoryName1",
          description: "First subcategory description",
        },
      },
    );
  typia.assert(firstSubcategory);
  // Creating second subcategory with different name
  const secondSubcategory =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { productCategoryId },
        body: {
          name: "UniqueSubcategoryName2",
          description: "Second subcategory description",
        },
      },
    );
  typia.assert(secondSubcategory);
  // Attempt to update second subcategory's name to first subcategory's name to cause duplication error
  const updateBody: IShoppingMallProductSubcategory.IUpdate = {
    name: firstSubcategory.name, // Intentionally duplicate
  };
  await TestValidator.error("duplicate subcategory name update", async () => {
    await api.functional.shoppingMall.administrator.product_categories.subcategories.updateSubcategory(
      adminConnection,
      {
        productCategoryId: productCategoryId,
        subcategoryId: secondSubcategory.id,
        body: updateBody,
      },
    );
  });
  // NOTE: Lack of get or list API for subcategory prevents verifying database state post update.
  // We rely on the error thrown to confirm the duplication check enforcement.
}
