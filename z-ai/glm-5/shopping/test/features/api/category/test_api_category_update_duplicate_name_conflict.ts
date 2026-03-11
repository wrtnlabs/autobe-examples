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
 * Test category update failure when attempting to rename a category to a name
 * that already exists in the system.
 *
 * This test verifies the business rule that category names must be unique
 * across all active categories in the platform.
 *
 * Steps:
 * 1. Administrator authenticates
 * 2. Create first category with unique name
 * 3. Create second category with different unique name
 * 4. Attempt to update second category with first category's name
 * 5. Validate that the system enforces category name uniqueness
 */
export async function test_api_category_update_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create first category with unique name
  const category1 =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `Category-First-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category1);
  // 3. Create second category with different unique name
  const category2 =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `Category-Second-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category2);
  // 4. Attempt to update second category with first category's name
  // This should fail with HTTP 409 Conflict due to duplicate name
  await TestValidator.error(
    "should reject update with duplicate category name",
    async () => {
      await api.functional.shoppingMall.administrator.admin.categories.update(
        adminConnection,
        {
          categoryId: category2.id,
          body: {
            name: category1.name,
          } satisfies IShoppingMallCategory.IUpdate,
        },
      );
    },
  );
}
