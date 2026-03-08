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
 * Test retrieving a subcategory and verifying its parent reference.
 *
 * Validates that:
 * - Subcategories display their parent category reference
 * - Customers can navigate from subcategory back to parent category
 * - One-level nesting constraint is enforced (subcategories have parent, parents have null parent)
 * - Breadcrumb navigation is supported through parent reference
 */
export async function test_api_category_subcategory_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create parent category (top-level, no parent)
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory under the parent
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
  // 4. Retrieve the subcategory via public API
  const retrievedSubcategory = await api.functional.shoppingMall.categories.at(
    connection,
    {
      categoryId: subcategory.id,
    },
  );
  typia.assert(retrievedSubcategory);
  // 5. Validate subcategory data matches created subcategory
  TestValidator.equals(
    "subcategory id matches",
    retrievedSubcategory.id,
    subcategory.id,
  );
  TestValidator.equals(
    "subcategory name matches",
    retrievedSubcategory.name,
    subcategory.name,
  );
  TestValidator.equals(
    "subcategory description matches",
    retrievedSubcategory.description,
    subcategory.description,
  );
  // 6. Validate parent reference exists and contains correct parent data
  TestValidator.predicate(
    "parent field is not null",
    retrievedSubcategory.parent !== null,
  );
  TestValidator.equals(
    "parent id matches",
    retrievedSubcategory.parent!.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name matches",
    retrievedSubcategory.parent!.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "parent description matches",
    retrievedSubcategory.parent!.description,
    parentCategory.description,
  );
  // 7. Validate one-level nesting constraint (parent's parent should be null for top-level parent)
  TestValidator.equals(
    "parent's parent is null",
    retrievedSubcategory.parent!.parent,
    null,
  );
}
