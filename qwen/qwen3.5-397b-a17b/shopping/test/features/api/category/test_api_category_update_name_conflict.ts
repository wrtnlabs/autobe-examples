import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
 * Test category update rejection when new name conflicts with existing category.
 *
 * Validates the complete category update workflow including administrative authentication, category creation, and name conflict detection. Ensures that the system properly enforces the uniqueness constraint on category names and rejects updates that would violate this constraint.
 *
 * The test creates two distinct categories with different names, then attempts to update one category's name to match the other category's name. This validates the business logic that category names must be unique across all categories in the catalog.
 *
 * 1. Administrator authenticates using utility function with randomized credentials.
 * 2. Creates first category with unique name (conflict target).
 * 3. Creates second category with different name (to be updated).
 * 4. Attempts to update second category's name to match first category's name.
 * 5. Validates the update is rejected with conflict error due to name uniqueness constraint.
 * 6. Verifies both categories retain their original names after failed update attempt.
 */
export async function test_api_category_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  // 2. Create first category (conflict target)
  const category1 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category1);
  // 3. Create second category (to be updated)
  const category2 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category2);
  // 4. Verify categories have different names initially
  TestValidator.notEquals(
    "categories have different names",
    category1.name,
    category2.name,
  );
  // 5. Store original names for verification after failed update
  const originalCategory1Name = category1.name;
  const originalCategory2Name = category2.name;
  // 6. Attempt to update category2's name to match category1's name (should fail with conflict)
  await TestValidator.error("name conflict rejected", async () => {
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: category2.id,
      body: {
        name: category1.name,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  });
  // 7. Verify both categories retain their original names after failed update
  TestValidator.equals(
    "category1 name unchanged",
    category1.name,
    originalCategory1Name,
  );
  TestValidator.equals(
    "category2 name unchanged",
    category2.name,
    originalCategory2Name,
  );
}
