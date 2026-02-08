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

export async function test_api_product_subcategory_update_success_and_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of an existing product subcategory
  // 1. Administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Create product category
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(category);
  // Storing categoryId safely as string
  const categoryId = (category as any).id as string;
  // 3. Create product subcategory
  const subcategory =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { categoryId },
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(subcategory);
  // Storing subcategoryId and original fields safely
  const subcategoryId = (subcategory as any).id as string;
  const originalName = (subcategory as any).name as string;
  const originalDescription = (subcategory as any).description as string;
  // 4. Update subcategory with new unique name and description
  const newName = RandomGenerator.name(2) + " unique";
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedSubcategory =
    await api.functional.shoppingMall.administrator.product.categories.subcategories.update(
      adminConnection,
      {
        categoryId,
        subcategoryId,
        body: {
          name: newName,
          description: newDescription,
        },
      },
    );
  typia.assert(updatedSubcategory);
  // Validate updated fields against stored values
  TestValidator.equals(
    "subcategory id should be unchanged",
    (updatedSubcategory as any).id,
    subcategoryId,
  );
  TestValidator.equals(
    "categoryId should be unchanged",
    (updatedSubcategory as any).categoryId,
    categoryId,
  );
  TestValidator.equals(
    "name should be updated",
    (updatedSubcategory as any).name,
    newName,
  );
  TestValidator.equals(
    "description should be updated",
    (updatedSubcategory as any).description,
    newDescription,
  );
  // Scenario 2: Attempt to update with duplicate subcategory name
  // 1. Create a new product category for duplicate name test
  const dupCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(dupCategory);
  const dupCategoryId = (dupCategory as any).id as string;
  // 2. Create two distinct subcategories
  const firstSubcat =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { categoryId: dupCategoryId },
        body: {
          name: "FirstSubcat" + RandomGenerator.alphabets(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(firstSubcat);
  const secondSubcat =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { categoryId: dupCategoryId },
        body: {
          name: "SecondSubcat" + RandomGenerator.alphabets(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(secondSubcat);
  // Store ids and names for conflict test
  const firstSubcatId = (firstSubcat as any).id as string;
  const firstSubcatName = (firstSubcat as any).name as string;
  const secondSubcatId = (secondSubcat as any).id as string;
  const secondSubcatDescription = (secondSubcat as any).description as string;
  // 3. Attempt to update second subcategory's name to first subcategory's name (duplicate)
  await TestValidator.error(
    "duplicate subcategory name should cause conflict",
    async () => {
      await api.functional.shoppingMall.administrator.product.categories.subcategories.update(
        adminConnection,
        {
          categoryId: dupCategoryId,
          subcategoryId: secondSubcatId,
          body: {
            name: firstSubcatName,
            description: secondSubcatDescription,
          },
        },
      );
    },
  );
  // 4. Confirm the second subcategory remains unchanged after failed update attempt
  // No explicit fetch API available; rely on the error and no data mutation.
}
