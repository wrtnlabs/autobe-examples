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
 * Test category-subcategory hierarchy with one-level nesting constraint.
 *
 * Verifies that:
 * 1. Administrators can create top-level categories (parent_id: null)
 * 2. Subcategories can be created under top-level categories
 * 3. Subcategory parent is correctly referenced with parent.parent being null
 * 4. One-level nesting is enforced - subcategories cannot have subcategories
 */
export async function test_api_category_subcategory_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create parent top-level category (no parent)
  const parentName = RandomGenerator.name();
  const parentDescription = RandomGenerator.paragraph({ sentences: 3 });
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: parentName,
          description: parentDescription,
          parent_id: null,
        },
      },
    );
  typia.assert(parentCategory);
  // Verify parent is top-level (no parent reference)
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent,
    null,
  );
  // 3. Create subcategory under the parent
  const subcategoryName = RandomGenerator.name();
  const subcategoryDescription = RandomGenerator.paragraph({ sentences: 2 });
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: subcategoryName,
          description: subcategoryDescription,
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Validate subcategory response
  TestValidator.equals(
    "subcategory name matches",
    subcategory.name,
    subcategoryName,
  );
  TestValidator.predicate(
    "subcategory has valid id",
    subcategory.id.length === 36,
  );
  TestValidator.equals(
    "subcategory parent id matches",
    subcategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory parent name matches",
    subcategory.parent?.name,
    parentName,
  );
  TestValidator.equals(
    "subcategory parent is top-level",
    subcategory.parent?.parent,
    null,
  );
  // 5. Edge case: Attempting to create subcategory under another subcategory should fail
  // (One-level nesting constraint enforcement)
  await TestValidator.httpError(
    "cannot create subcategory under subcategory",
    422,
    async () => {
      await generate_random_shopping_mall_administrator_categories_create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 1 }),
            parent_id: subcategory.id,
          },
        },
      );
    },
  );
}
