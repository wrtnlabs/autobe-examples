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

/**
 * Test viewing a subcategory (child category) that has a parent reference.
 * This validates the navigation path where customers drill down into specific product classifications.
 *
 * Setup steps:
 * 1. Administrator creates a parent category
 * 2. Administrator creates a subcategory under the parent
 *
 * Test execution:
 * 1. Call GET /shoppingMall/categories/{categoryId} with the subcategory's ID
 * 2. Verify response includes correct subcategory details
 * 3. Verify parent field contains reference to parent category
 * 4. Verify children array is empty
 */
export async function test_api_category_subcategory_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create parent category
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory under the parent
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: {
          categoryId: parentCategory.id,
        },
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Fetch the subcategory by ID (public endpoint - no auth required)
  const fetchedSubcategory = await api.functional.shoppingMall.categories.at(
    connection,
    {
      categoryId: subcategory.id,
    },
  );
  typia.assert(fetchedSubcategory);
  // 5. Validate subcategory details
  TestValidator.equals("subcategory id", fetchedSubcategory.id, subcategory.id);
  TestValidator.equals(
    "subcategory name",
    fetchedSubcategory.name,
    subcategory.name,
  );
  TestValidator.equals(
    "subcategory description",
    fetchedSubcategory.description,
    subcategory.description,
  );
  // 6. Validate parent reference is populated
  TestValidator.predicate(
    "parent reference exists",
    fetchedSubcategory.parent !== null,
  );
  TestValidator.equals(
    "parent id",
    fetchedSubcategory.parent!.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name",
    fetchedSubcategory.parent!.name,
    parentCategory.name,
  );
  // 7. Validate children array is empty (subcategories cannot have nested subcategories)
  TestValidator.predicate(
    "children array is empty",
    fetchedSubcategory.children.length === 0,
  );
}
