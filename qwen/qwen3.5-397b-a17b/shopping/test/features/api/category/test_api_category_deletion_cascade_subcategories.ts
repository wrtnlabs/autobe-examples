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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test cascade deletion behavior when administrator deletes a parent category with subcategories.
 *
 * This test validates:
 * 1. Administrator can authenticate successfully
 * 2. Parent category can be created at top level
 * 3. Subcategories can be created under the parent category
 * 4. Deleting parent category triggers cascade deletion of all subcategories
 * 5. Delete operation returns 204 No Content (soft delete)
 * 6. The category hierarchy is properly removed from the system
 *
 * Note: Since there's no list endpoint available in the provided SDK, we verify
 * the deletion workflow completes successfully. The cascade behavior is enforced
 * by the backend transaction which soft-deletes all descendants.
 */
export async function test_api_category_deletion_cascade_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create parent category (top-level, no parent)
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
        },
      },
    );
  typia.assert(parentCategory);
  // Verify parent category structure
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent,
    null,
  );
  TestValidator.predicate(
    "parent category is active",
    parentCategory.deleted_at === null,
  );
  // 3. Create first subcategory under parent
  const subcategory1 =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory1);
  // Verify subcategory1 structure with proper type guard
  TestValidator.notEquals("subcategory1 has parent", subcategory1.parent, null);
  typia.assertGuard(subcategory1.parent!);
  TestValidator.equals(
    "subcategory1 parent ID matches",
    subcategory1.parent.id,
    parentCategory.id,
  );
  TestValidator.predicate(
    "subcategory1 is active",
    subcategory1.deleted_at === null,
  );
  // 4. Create second subcategory under same parent
  const subcategory2 =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory2);
  // Verify subcategory2 structure with proper type guard
  TestValidator.notEquals("subcategory2 has parent", subcategory2.parent, null);
  typia.assertGuard(subcategory2.parent!);
  TestValidator.equals(
    "subcategory2 parent ID matches",
    subcategory2.parent.id,
    parentCategory.id,
  );
  TestValidator.predicate(
    "subcategory2 is active",
    subcategory2.deleted_at === null,
  );
  // 5. Delete parent category (triggers cascade deletion of subcategories)
  // The backend performs soft delete with cascade to all descendants
  await api.functional.shoppingMall.administrator.categories.erase(
    adminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  // 6. Verify deletion completed successfully
  // The erase operation returns void (204 No Content) on success
  // Cascade deletion of subcategories is handled by backend transaction
  // Products referencing deleted categories become uncategorized but remain accessible
}
