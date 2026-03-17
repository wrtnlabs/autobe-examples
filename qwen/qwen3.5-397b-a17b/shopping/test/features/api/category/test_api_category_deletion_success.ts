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
 * Test successful category deletion by an administrator.
 *
 * This test validates the primary success path where an administrator
 * removes an empty category from the classification system through soft deletion.
 *
 * Test Flow:
 * 1. Authenticate as administrator using authorize_admin_join utility
 * 2. Create a top-level category using generate_random_shopping_mall_admin_categories_create
 * 3. Delete the category using admin category erase endpoint
 * 4. Verify deletion succeeded with void response
 *
 * @param connection Base connection for the test
 */
export async function test_api_category_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  TestValidator.equals("admin grade", adminAuth.grade, "ADMIN");
  // 2. Create a top-level category (no parent) to be deleted
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_category_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  TestValidator.equals(
    "category is not deleted initially",
    category.deleted_at,
    null,
  );
  // 3. Delete the category using admin erase endpoint
  await api.functional.shoppingMall.admin.admin.categories.erase(
    adminConnection,
    {
      categoryId: category.id,
    },
  );
  // 4. Deletion success validated by no error thrown (void response)
}
