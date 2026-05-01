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
 * Test promoting a subcategory to a top-level category by clearing its parent reference.
 *
 * Validates that an administrator can promote an existing subcategory to the top level
 * of the two-tier category hierarchy. After promotion, the category's parent becomes null,
 * it stands independently from its former parent, and it appears as a standalone
 * top-level category with no children of its own since the platform enforces at most
 * one level of nesting.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Administrator creates a top-level parent category with random data.
 * 3. Administrator creates a subcategory nested under the parent category.
 * 4. Administrator promotes the subcategory by setting parentId to null via update.
 * 5. Validates the promoted category has parent set to null, retains its name and
 *    description, its id remains unchanged, and it has an empty children array.
 */
export async function test_api_category_promote_subcategory_to_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create top-level parent category
  const parent = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(parent);
  // 3. Create subcategory under parent
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      { body: { parent_id: parent.id } },
    );
  typia.assert(subcategory);
  // Verify initial state: subcategory has parent
  TestValidator.equals(
    "subcategory has parent reference",
    subcategory.parent?.id,
    parent.id,
  );
  // 4. Promote subcategory to top-level by setting parentId to null
  const promoted = await api.functional.shoppingMall.admin.categories.update(
    adminConnection,
    {
      categoryId: subcategory.id,
      body: { parentId: null } satisfies IShoppingMallCategory.IUpdate,
    },
  );
  typia.assert(promoted);
  // 5. Validate promotion
  TestValidator.equals(
    "promoted category parent is null",
    promoted.parent,
    null,
  );
  TestValidator.equals(
    "promoted category retains name",
    promoted.name,
    subcategory.name,
  );
  TestValidator.equals(
    "promoted category retains description",
    promoted.description,
    subcategory.description,
  );
  TestValidator.predicate(
    "promoted category id unchanged",
    promoted.id === subcategory.id,
  );
  TestValidator.equals(
    "promoted category has no children",
    promoted.children.length,
    0,
  );
}
