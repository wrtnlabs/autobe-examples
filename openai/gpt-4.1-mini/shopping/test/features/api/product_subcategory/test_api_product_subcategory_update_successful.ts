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

export async function test_api_product_subcategory_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 2. Create a product category for parent reference
  const productCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(productCategory);
  // 3. Create a product subcategory under parent category
  const productSubcategory =
    await generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory(
      adminConnection,
      {
        params: { productCategoryId: productCategory.id },
        body: {},
      },
    );
  typia.assert(productSubcategory);
  // 4. Prepare update data with new name and description
  const updateData: IShoppingMallProductSubcategory.IUpdate = {
    name: productSubcategory.name + " Updated",
    description: productSubcategory.description + " Updated",
  };
  // 5. Update the product subcategory
  const updatedSubcategory =
    await api.functional.shoppingMall.administrator.productCategories.productSubcategories.update(
      adminConnection,
      {
        productCategoryId: productCategory.id,
        productSubcategoryId: productSubcategory.id,
        body: updateData,
      },
    );
  typia.assert(updatedSubcategory);
  // 6. Validate that the update preserves the composite uniqueness of subcategory name within the category
  TestValidator.equals(
    "subcategory name updated",
    updatedSubcategory.name,
    updateData.name,
  );
  TestValidator.equals(
    "subcategory description updated",
    updatedSubcategory.description,
    updateData.description,
  );
  TestValidator.equals(
    "subcategory parent category id matches",
    updatedSubcategory.category.id,
    productCategory.id,
  );
  TestValidator.predicate(
    "updatedAt timestamp changed",
    updatedSubcategory.updatedAt !== productSubcategory.updatedAt,
  );
  TestValidator.equals(
    "id remains same",
    updatedSubcategory.id,
    productSubcategory.id,
  );
}
