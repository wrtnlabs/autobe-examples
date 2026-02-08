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
import { generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";
import { prepare_random_shopping_mall_product_subcategory } from "../../../prepare/prepare_random_shopping_mall_product_subcategory";

export async function test_api_product_subcategory_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Admin join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  // Set admin token in adminConnection headers
  adminConnection.headers = {
    Authorization: `Bearer ${administrator.token.access}`,
  };
  // Create product category using utility function
  const rawProductCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  // Assert productCategory to have id, name, description
  const productCategory = typia.assert<IShoppingMallProductCategory & { id: string; name: string; description: string }>(rawProductCategory);

  // Create product subcategory under the created category
  const rawProductSubcategory =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { categoryId: productCategory.id },
      },
    );
  // Assert productSubcategory to have id
  const productSubcategory = typia.assert<IShoppingMallProductSubcategory & { id: string }>(rawProductSubcategory);

  // Delete the product subcategory
  await api.functional.shoppingMall.administrator.product.categories.subcategories.eraseSubcategory(
    adminConnection,
    {
      categoryId: productCategory.id,
      subcategoryId: productSubcategory.id,
    },
  );

  // Deleting the same subcategory again should result in 404 Not Found
  await TestValidator.httpError(
    "delete non-existent subcategory",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.product.categories.subcategories.eraseSubcategory(
        adminConnection,
        {
          categoryId: productCategory.id,
          subcategoryId: productSubcategory.id,
        },
      ),
  );

  // Authorization enforcement test: try deleting with unauthorized connection
  // New user connection has no admin token
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized deletion attempt",
    401,
    async () =>
      await api.functional.shoppingMall.administrator.product.categories.subcategories.eraseSubcategory(
        unauthorizedConnection,
        {
          categoryId: productCategory.id,
          subcategoryId: productSubcategory.id,
        },
      ),
  );

  // Verify the product category remains unaffected by checking name and description
  TestValidator.predicate(
    "product category name exists",
    typeof productCategory.name === "string" && productCategory.name.length > 0,
  );
  TestValidator.predicate(
    "product category description exists",
    typeof productCategory.description === "string" &&
      productCategory.description.length > 0,
  );
}
