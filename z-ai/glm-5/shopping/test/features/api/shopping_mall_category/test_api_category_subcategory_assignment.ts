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

export async function test_api_category_subcategory_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create parent category (top-level, no parent)
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        },
      },
    );
  typia.assert(parentCategory);
  // Verify parent is top-level (parent is null)
  TestValidator.equals("parent is top-level", parentCategory.parent, null);
  // 3. Create child category (initially top-level)
  const childCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        },
      },
    );
  typia.assert(childCategory);
  // Verify child is initially top-level
  TestValidator.equals("child initially top-level", childCategory.parent, null);
  // 4. Update child category to become subcategory of parent
  const updatedCategory =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: childCategory.id,
        body: {
          parentId: parentCategory.id,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate the parent-child relationship is established
  TestValidator.predicate(
    "parent field exists",
    updatedCategory.parent !== null,
  );
  if (updatedCategory.parent !== null) {
    TestValidator.equals(
      "parent id matches",
      updatedCategory.parent.id,
      parentCategory.id,
    );
    TestValidator.equals(
      "parent name matches",
      updatedCategory.parent.name,
      parentCategory.name,
    );
    TestValidator.equals(
      "parent description matches",
      updatedCategory.parent.description,
      parentCategory.description,
    );
  }
  // 6. Verify subcategory nesting - parent must be top-level (parent.parent is null)
  TestValidator.equals(
    "subcategory parent is top-level",
    updatedCategory.parent?.parent,
    null,
  );
  // 7. Verify the category id remains unchanged
  TestValidator.equals(
    "category id unchanged",
    updatedCategory.id,
    childCategory.id,
  );
  // 8. Create another subcategory under same parent to test multiple subcategories
  const anotherChildCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        },
      },
    );
  typia.assert(anotherChildCategory);
  const anotherUpdatedCategory =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: anotherChildCategory.id,
        body: {
          parentId: parentCategory.id,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(anotherUpdatedCategory);
  // Verify multiple subcategories can exist under same parent
  TestValidator.equals(
    "second subcategory parent matches",
    anotherUpdatedCategory.parent?.id,
    parentCategory.id,
  );
}
