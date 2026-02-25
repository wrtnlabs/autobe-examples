import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSubcategory";
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
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";

export async function test_api_administrator_product_subcategories_modify_delete_successful(
  connection: api.IConnection,
): Promise<void> {
  // Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123",
  };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: adminJoinInput,
  });
  // Authorization header updated internally by utility
  // Create a product category
  const productCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(productCategory);
  // Create initial subcategories (one by one using PATCH, to simulate)
  const initialSubcategoriesNames = [
    "InitialSubcategory1",
    "InitialSubcategory2",
    "InitialSubcategory3",
  ];
  for (const name of initialSubcategoriesNames) {
    const patchBody: IShoppingMallProductSubcategory.IRequest = {
      name: name,
      description: `Description for ${name}`,
      page: 1,
      limit: 10,
    };
    const patchResponse =
      await api.functional.shoppingMall.administrator.product_categories.subcategories.updateSubcategories(
        adminConnection,
        {
          productCategoryId: productCategory.id,
          body: patchBody,
        },
      );
    typia.assert(patchResponse);
    TestValidator.predicate(
      `patch create response contains ${name}`,
      patchResponse.data.some((sub) => sub.name === name),
    );
  }
  // Fetch all subcategories to confirm
  let fetchResponse =
    await api.functional.shoppingMall.administrator.product_categories.subcategories.updateSubcategories(
      adminConnection,
      {
        productCategoryId: productCategory.id,
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(fetchResponse);
  const createdSubcategories = fetchResponse.data;
  TestValidator.equals(
    "initial subcategories count",
    createdSubcategories.length,
    initialSubcategoriesNames.length,
  );
  // Prepare modified subcategories list - update first two, omit third for deletion
  const modifiedSubcategoriesBody: IShoppingMallProductSubcategory.IRequest = {
    name: undefined, // Not filtering by name
    description: undefined, // Not filtering by description
    page: 1,
    limit: 10,
  };
  // To update subcategories we must PATCH with their names modified
  // Since the API does not take array of subcategories, we simulate by multiple calls
  // Update first subcategory name
  const update1Body: IShoppingMallProductSubcategory.IRequest = {
    name: "ModifiedSubcategory1",
    description: "Modified description 1",
    page: 1,
    limit: 10,
  };
  await api.functional.shoppingMall.administrator.product_categories.subcategories.updateSubcategories(
    adminConnection,
    {
      productCategoryId: productCategory.id,
      body: update1Body,
    },
  );
  // Update second subcategory name
  const update2Body: IShoppingMallProductSubcategory.IRequest = {
    name: "ModifiedSubcategory2",
    description: "Modified description 2",
    page: 1,
    limit: 10,
  };
  await api.functional.shoppingMall.administrator.product_categories.subcategories.updateSubcategories(
    adminConnection,
    {
      productCategoryId: productCategory.id,
      body: update2Body,
    },
  );
  // Add a new subcategory
  const newSubcategoryBody: IShoppingMallProductSubcategory.IRequest = {
    name: "NewSubcategory",
    description: "New subcategory description",
    page: 1,
    limit: 10,
  };
  await api.functional.shoppingMall.administrator.product_categories.subcategories.updateSubcategories(
    adminConnection,
    {
      productCategoryId: productCategory.id,
      body: newSubcategoryBody,
    },
  );
  // Fetch all subcategories after modifications
  fetchResponse =
    await api.functional.shoppingMall.administrator.product_categories.subcategories.updateSubcategories(
      adminConnection,
      {
        productCategoryId: productCategory.id,
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(fetchResponse);
  const updatedSubcategories = fetchResponse.data;
  const updatedNames = updatedSubcategories.map((sub) => sub.name);
  // Validate all expected names present
  TestValidator.predicate(
    "updated subcategories contain modified and new names",
    updatedNames.includes("ModifiedSubcategory1") &&
      updatedNames.includes("ModifiedSubcategory2") &&
      updatedNames.includes("NewSubcategory"),
  );
  // Validate deleted subcategory no longer present
  TestValidator.predicate(
    "deleted subcategory name no longer present",
    !updatedNames.includes("InitialSubcategory3"),
  );
  // Validate uniqueness
  const uniqueNames = new Set(updatedNames);
  TestValidator.equals(
    "unique subcategory names after update",
    uniqueNames.size,
    updatedNames.length,
  );
}
