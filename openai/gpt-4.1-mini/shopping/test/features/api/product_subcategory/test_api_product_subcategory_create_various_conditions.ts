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

export async function test_api_product_subcategory_create_various_conditions(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful creation of a product subcategory by an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Create a valid product category
  const productCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(productCategory);
  // Create a product subcategory with unique name and description
  const subcategoryBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductSubcategory.ICreate;
  const productSubcategory =
    await generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory(
      adminConnection,
      {
        body: subcategoryBody,
        params: { productCategoryId: productCategory.id },
      },
    );
  typia.assert(productSubcategory);
  TestValidator.equals(
    "subcategory's category id matches",
    productSubcategory.category.id,
    productCategory.id,
  );
  TestValidator.equals(
    "subcategory's name matches",
    productSubcategory.name,
    subcategoryBody.name,
  );
  TestValidator.equals(
    "subcategory's description matches",
    productSubcategory.description,
    subcategoryBody.description,
  );
  // Scenario 2: Attempt to create product subcategory under non-existent category
  const fakeCategoryId = typia.random<string & tags.Format<"uuid">>();
  const fakeBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallProductSubcategory.ICreate;
  await TestValidator.httpError(
    "404 when parent category not found",
    404,
    async () => {
      await generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory(
        adminConnection,
        { body: fakeBody, params: { productCategoryId: fakeCategoryId } },
      );
    },
  );
  // Scenario 3: Attempt to create duplicate subcategory name under same category
  const duplicateName = RandomGenerator.name();
  const firstSubcategoryBody = {
    name: duplicateName,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallProductSubcategory.ICreate;
  // Create first subcategory
  const firstSubcategory =
    await generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory(
      adminConnection,
      {
        body: firstSubcategoryBody,
        params: { productCategoryId: productCategory.id },
      },
    );
  typia.assert(firstSubcategory);
  // Try to create second subcategory with the same name
  const duplicateSubcategoryBody = {
    name: duplicateName,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallProductSubcategory.ICreate;
  await TestValidator.httpError(
    "409 conflict on duplicate subcategory name",
    409,
    async () => {
      await generate_random_shopping_mall_administrator_product_categories_product_subcategories_create_product_subcategory(
        adminConnection,
        {
          body: duplicateSubcategoryBody,
          params: { productCategoryId: productCategory.id },
        },
      );
    },
  );
}
