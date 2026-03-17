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
 * Test that an administrator can successfully create a top-level category.
 *
 * This test verifies:
 * 1. Admin registration via authorize_admin_join utility
 * 2. Top-level category creation with parent_category_id set to null
 * 3. Response contains complete category object with all required fields
 * 4. Parent is null (confirming top-level status)
 * 5. created_by_admin_id matches the authenticated admin's ID
 */
export async function test_api_category_admin_create_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create top-level category with parent_category_id explicitly null
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_category_id: null,
      },
    },
  );
  typia.assert(category);
  // 3. Validate category is top-level (parent is null)
  TestValidator.equals("parent is null for top-level", category.parent, null);
  // 4. Validate created_by_admin_id matches admin
  TestValidator.equals(
    "created_by_admin_id matches admin",
    category.created_by_admin_id,
    adminAuth.id,
  );
}
