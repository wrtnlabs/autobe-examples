import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test that an administrator cannot change the parent of a subcategory.
 *
 * Validates the business rule that subcategories cannot have their parent_id changed
 * after creation. This enforces the maximum one-level nesting constraint in the
 * category hierarchy. When an administrator attempts to modify the parent_id of a
 * subcategory, the request must be rejected with an appropriate error.
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. A parent category is created to serve as the subcategory's initial parent.
 * 3. A subcategory is created under the parent category.
 * 4. A second parent category is created to serve as the attempted new parent.
 * 5. Administrator attempts to update the subcategory's parent_id to the new parent.
 * 6. Request is rejected with error status.
 * 7. Subcategory remains unchanged with its original parent.
 */
export async function test_api_category_update_subcategory_parent_change_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create first parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  // 3. Create subcategory under the parent
  const subcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // Verify subcategory has correct parent
  TestValidator.equals(
    "subcategory parent is set correctly",
    subcategory.parent?.id,
    parentCategory.id,
  );
  // 4. Create second parent category to attempt as new parent
  const newParentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(newParentCategory);
  // 5. Attempt to change subcategory's parent - should be rejected
  await TestValidator.httpError(
    "subcategory parent change rejected",
    [400, 422] as number[],
    async () =>
      await api.functional.ecommerceMall.admin.admin.categories.update(
        adminConnection,
        {
          categoryId: subcategory.id,
          body: {
            parentId: newParentCategory.id,
          } satisfies IEcommerceMallCategory.IUpdate,
        },
      ),
  );
}
