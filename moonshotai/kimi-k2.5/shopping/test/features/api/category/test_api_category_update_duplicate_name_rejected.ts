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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test category name uniqueness constraint during update.
 *
 * Validates that updating a category with a duplicate name (case-insensitive)
 * within the same parent scope is rejected with a conflict error.
 *
 * 1. Authenticate as administrator
 * 2. Create first category with name "Electronics"
 * 3. Create second category with name "Clothing"
 * 4. Attempt to update second category's name to "electronics" (duplicate)
 * 5. Verify update is rejected with error
 */
export async function test_api_category_update_duplicate_name_rejected(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com",
      ip: "192.168.1.1",
    },
  });
  // 2. Create first category with name "Electronics"
  const firstCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
          parentId: null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  // 3. Create second category with name "Clothing"
  const secondCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Clothing",
          description: "Apparel and fashion items",
          parentId: null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(secondCategory);
  // 4. Attempt to update second category's name to "electronics" (case-insensitive duplicate)
  // 5. Verify update is rejected with conflict error
  await TestValidator.error(
    "reject duplicate category name update",
    async () => {
      await api.functional.ecommerceMall.admin.categories.update(
        adminConnection,
        {
          categoryId: secondCategory.id,
          body: {
            name: "electronics",
          } satisfies IEcommerceMallCategory.IUpdate,
        },
      );
    },
  );
}
