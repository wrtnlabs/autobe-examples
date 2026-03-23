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
 * Test creating a subcategory under an existing top-level category.
 * 1. Authenticate as administrator
 * 2. Create a top-level category (parent)
 * 3. Create a subcategory referencing the parent
 * 4. Validate subcategory has correct parent reference
 * 5. Verify one-level nesting constraint (parent's parent_id is null)
 */
export async function test_api_category_create_subcategory_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create top-level category (parent)
  const parentCategory =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);
  // 3. Create subcategory with parent reference
  const subcategory = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parent_id: parentCategory.id,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(subcategory);
  // 4. Validate subcategory has correct parent reference
  TestValidator.equals(
    "subcategory parent_id matches",
    subcategory.parent?.id,
    parentCategory.id,
  );
  // 5. Verify parent summary contains correct name
  TestValidator.equals(
    "subcategory parent name matches",
    subcategory.parent?.name,
    parentCategory.name,
  );
  // 6. Verify one-level nesting constraint (parent's parent_id is null)
  TestValidator.equals(
    "parent category has no parent (one-level nesting)",
    subcategory.parent?.parent,
    null,
  );
}
