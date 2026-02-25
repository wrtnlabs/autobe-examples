import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test retrieving a subcategory that has a parent category reference.
 *
 * This test validates the bidirectional category hierarchy navigation:
 * 1. Administrator creates a parent category (top-level)
 * 2. Administrator creates a subcategory under the parent
 * 3. Retrieve the subcategory and verify:
 *    - The parent field is populated with id and name of the parent category
 *    - The children array is empty (two-level hierarchy limit)
 */
export async function test_api_category_subcategory_with_parent_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a parent category (top-level, parentId is null/undefined)
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Parent Category ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory under the parent category
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Subcategory ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Retrieve the subcategory using the public endpoint
  const retrievedSubcategory = await api.functional.shoppingMall.categories.at(
    connection,
    {
      categoryId: subcategory.id,
    },
  );
  typia.assert(retrievedSubcategory);
  // 5. Verify the parent field is populated with an object containing id and name
  TestValidator.predicate(
    "parent field should be populated for subcategory",
    retrievedSubcategory.parent !== null,
  );
  // 6. Verify the parent field contains the correct id and name
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
  // 7. Verify the children array is empty for subcategories (two-level hierarchy limit)
  TestValidator.equals(
    "children array should be empty for subcategories",
    retrievedSubcategory.children.length,
    0,
  );
}
