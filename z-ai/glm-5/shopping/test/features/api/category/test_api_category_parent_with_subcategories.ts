import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_administrator_categories_subcategories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_subcategories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_parent_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create parent category (top-level category)
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `Electronics-${RandomGenerator.alphaNumeric(8)}`,
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create multiple subcategories under the parent
  const subcategoryNames = ["Smartphones", "Laptops", "Tablets"];
  const createdSubcategories: IShoppingMallCategory[] = [];
  for (const subcategoryName of subcategoryNames) {
    const subcategory =
      await generate_random_shopping_mall_administrator_categories_subcategories_create(
        adminConnection,
        {
          params: { categoryId: parentCategory.id },
          body: {
            name: `${subcategoryName}-${RandomGenerator.alphaNumeric(8)}`,
            description: `${subcategoryName} and related products`,
          },
        },
      );
    typia.assert(subcategory);
    createdSubcategories.push(subcategory);
  }
  // 4. Retrieve parent category without authentication (public endpoint)
  const retrievedCategory = await api.functional.shoppingMall.categories.at(
    connection,
    { categoryId: parentCategory.id },
  );
  typia.assert(retrievedCategory);
  // 5. Validate response
  TestValidator.equals("category id", retrievedCategory.id, parentCategory.id);
  TestValidator.equals(
    "category name",
    retrievedCategory.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "category description",
    retrievedCategory.description,
    parentCategory.description,
  );
  TestValidator.equals(
    "parent is null for top-level",
    retrievedCategory.parent,
    null,
  );
  // 6. Verify children array contains all created subcategories
  TestValidator.equals(
    "children count",
    retrievedCategory.children.length,
    createdSubcategories.length,
  );
  for (const createdSubcategory of createdSubcategories) {
    const found = retrievedCategory.children.find(
      (child) => child.id === createdSubcategory.id,
    );
    TestValidator.predicate(
      `subcategory ${createdSubcategory.name} in children`,
      found !== undefined,
    );
    if (found) {
      TestValidator.equals(
        "subcategory name matches",
        found.name,
        createdSubcategory.name,
      );
    }
  }
}
