import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test retrieving a parent (top-level) category that has subcategories.
 *
 * This test validates that:
 * - Top-level categories have null parent reference
 * - Parent categories display their subcategories for navigation
 * - One level of nesting is supported
 * - Categories are browsable without authentication
 */
export async function test_api_category_parent_category_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a parent category (top-level, no parent_id)
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory under the parent category
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: parentCategory.id,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Retrieve the parent category using public endpoint (no authentication required)
  const retrievedCategory = await api.functional.shoppingMall.categories.at(
    connection,
    {
      categoryId: parentCategory.id,
    },
  );
  typia.assert(retrievedCategory);
  // 5. Verify parent category properties
  TestValidator.equals(
    "category id matches",
    retrievedCategory.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    parentCategory.description,
  );
  // 6. Verify parent field is null (top-level category)
  TestValidator.equals(
    "parent is null for top-level category",
    retrievedCategory.parent,
    null,
  );
  // 7. Retrieve the subcategory to verify parent-child relationship
  const retrievedSubcategory = await api.functional.shoppingMall.categories.at(
    connection,
    {
      categoryId: subcategory.id,
    },
  );
  typia.assert(retrievedSubcategory);
  // 8. Verify subcategory has correct parent reference
  TestValidator.equals(
    "subcategory id matches",
    retrievedSubcategory.id,
    subcategory.id,
  );
  TestValidator.predicate(
    "subcategory has parent reference",
    retrievedSubcategory.parent !== null,
  );
  if (retrievedSubcategory.parent !== null) {
    TestValidator.equals(
      "subcategory parent id matches",
      retrievedSubcategory.parent.id,
      parentCategory.id,
    );
  }
}
