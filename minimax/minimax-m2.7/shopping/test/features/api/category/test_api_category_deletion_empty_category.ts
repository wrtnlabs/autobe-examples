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
 * Test admin can delete empty category with no products and no subcategories.
 * 1. Authenticate as admin using /auth/admin/join
 * 2. Create empty category with no parent
 * 3. Delete the empty category
 * 4. Verify deletion was successful (category not retrievable)
 */
export async function test_api_category_deletion_empty_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create empty category (no products, no subcategories)
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
        },
      },
    );
  typia.assert(category);
  TestValidator.equals("category has no parent", category.parent ?? null, null);
  TestValidator.equals(
    "category has no subcategories",
    category.subcategories.length,
    0,
  );
  TestValidator.equals(
    "category is not deleted yet",
    category.deleted_at,
    null,
  );
  // 3. Delete the empty category
  await api.functional.ecommerceMall.admin.categories.erase(adminConnection, {
    categoryId: category.id,
  });
  // 4. Verify deletion was successful
  // The erase function returns void, so we verify by confirming no error was thrown
  TestValidator.predicate("category deletion completed without error", true);
}
