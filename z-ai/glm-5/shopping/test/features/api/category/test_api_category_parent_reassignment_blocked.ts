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
 * Test that a category with existing subcategories cannot be reassigned
 * as a subcategory of another category.
 *
 * This test validates the business rule that prevents creating more than
 * one level of nesting by blocking parent reassignment when a category
 * has children.
 */
export async function test_api_category_parent_reassignment_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create parent category A (top-level)
  const categoryA =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      { body: { name: RandomGenerator.name() } },
    );
  typia.assert(categoryA);
  // 3. Create category B (top-level)
  const categoryB =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      { body: { name: RandomGenerator.name() } },
    );
  typia.assert(categoryB);
  // 4. Create category C as a subcategory of B
  const categoryC =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          parent_id: categoryB.id,
        },
      },
    );
  typia.assert(categoryC);
  // 5. Attempt to reassign category B (which has children) as subcategory of A
  // This should fail because category B has children
  await TestValidator.error(
    "category with children cannot be reassigned as subcategory",
    async () => {
      await api.functional.shoppingMall.administrator.categories.update(
        adminConnection,
        {
          categoryId: categoryB.id,
          body: {
            parentId: categoryA.id,
          } satisfies IShoppingMallCategory.IUpdate,
        },
      );
    },
  );
  // 6. Verify category B remains a top-level category (parent is null)
  const updatedCategoryB =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: categoryB.id,
        body: {},
      },
    );
  typia.assert(updatedCategoryB);
  TestValidator.equals(
    "category B remains top-level",
    updatedCategoryB.parent,
    null,
  );
  // 7. Verify category C remains a subcategory of B
  const updatedCategoryC =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: categoryC.id,
        body: {},
      },
    );
  typia.assert(updatedCategoryC);
  TestValidator.predicate(
    "category C still has parent",
    updatedCategoryC.parent !== null,
  );
  TestValidator.equals(
    "category C's parent is still category B",
    updatedCategoryC.parent?.id,
    categoryB.id,
  );
}
