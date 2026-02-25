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
import { generate_random_shopping_mall_administrator_product_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_create";
import { generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";
import { prepare_random_shopping_mall_product_subcategory } from "../../../prepare/prepare_random_shopping_mall_product_subcategory";

export async function test_api_product_subcategory_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    },
  });
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // Create a product category
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      { body: { name: "Electronics", description: "Electronics category" } },
    );
  typia.assert(category);
  // Create first product subcategory
  const firstSubcategory =
    await generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory(
      adminConnection,
      {
        params: { productCategoryId: category.id },
        body: { name: "Laptops", description: "All kinds of laptops" },
      },
    );
  typia.assert(firstSubcategory);
  // Create second product subcategory
  const secondSubcategory =
    await generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory(
      adminConnection,
      {
        params: { productCategoryId: category.id },
        body: { name: "Smartphones", description: "Smart mobile phones" },
      },
    );
  typia.assert(secondSubcategory);
  // Attempt to update second subcategory's name to the first subcategory's name to cause conflict
  await TestValidator.error(
    "update subcategory name to existing name causes conflict",
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.update(
        adminConnection,
        {
          productCategoryId: category.id,
          productSubcategoryId: secondSubcategory.id,
          body: {
            name: firstSubcategory.name,
          } satisfies IShoppingMallProductSubcategory.IUpdate,
        },
      );
    },
  );
}
