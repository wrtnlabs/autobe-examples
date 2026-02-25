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

export async function test_api_administrator_product_subcategory_retrieve_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "abcdefgh",
    },
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create a new product category
  const productCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(productCategory);
  // 3. Create a new product subcategory under the created category
  const productSubcategory =
    await generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory(
      adminConnection,
      {
        params: { productCategoryId: productCategory.id },
      },
    );
  typia.assert(productSubcategory);
  // 4. Retrieve the product subcategory details with correct IDs
  const retrievedSubcategory =
    await api.functional.shoppingMall.administrator.productCategories.productSubcategories.at(
      adminConnection,
      {
        productCategoryId: productCategory.id,
        productSubcategoryId: productSubcategory.id,
      },
    );
  typia.assert(retrievedSubcategory);
  TestValidator.equals(
    "subcategory name matches",
    retrievedSubcategory.name,
    productSubcategory.name,
  );
  TestValidator.equals(
    "subcategory description matches",
    retrievedSubcategory.description,
    productSubcategory.description,
  );
  TestValidator.equals(
    "subcategory category id matches",
    retrievedSubcategory.category.id,
    productCategory.id,
  );
  TestValidator.equals(
    "subcategory category name matches",
    retrievedSubcategory.category.name,
    productCategory.name,
  );
  TestValidator.equals(
    "subcategory category description matches",
    retrievedSubcategory.category.description,
    productCategory.description,
  );
  // 5. Edge case: subcategory does not belong to category
  // Create second product category
  const otherProductCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(otherProductCategory);
  // Try to retrieve subcategory with mismatched category ID
  await TestValidator.httpError(
    "subcategory-category mismatch returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.at(
        adminConnection,
        {
          productCategoryId: otherProductCategory.id,
          productSubcategoryId: productSubcategory.id,
        },
      );
    },
  );
  // 6. Edge case: non-existent productCategoryId or productSubcategoryId
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent category returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.at(
        adminConnection,
        {
          productCategoryId: nonExistentCategoryId,
          productSubcategoryId: productSubcategory.id,
        },
      );
    },
  );
  await TestValidator.httpError(
    "non-existent subcategory returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.at(
        adminConnection,
        {
          productCategoryId: productCategory.id,
          productSubcategoryId: nonExistentSubcategoryId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "non-existent category and subcategory returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.at(
        adminConnection,
        {
          productCategoryId: nonExistentCategoryId,
          productSubcategoryId: nonExistentSubcategoryId,
        },
      );
    },
  );
}
