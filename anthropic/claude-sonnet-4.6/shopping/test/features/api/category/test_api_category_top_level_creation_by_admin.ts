import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_category_top_level_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Prepare category data
  const categoryName = `Electronics_${RandomGenerator.alphabets(8)}`;
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  // 3. Create a top-level category (parent_id = null)
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: categoryName,
        description: categoryDescription,
        parent_id: null,
      },
    },
  );
  typia.assert(category);
  // 4. Validate returned category fields
  TestValidator.equals("category name matches", category.name, categoryName);
  TestValidator.equals(
    "category description matches",
    category.description,
    categoryDescription,
  );
  TestValidator.equals(
    "parent_id is null (top-level)",
    category.parent_id,
    null,
  );
  TestValidator.equals("parent is null (top-level)", category.parent, null);
  TestValidator.equals("children is empty array", category.children.length, 0);
  // 5. Business Rule: Duplicate name should be rejected
  await TestValidator.error(
    "duplicate top-level category name rejected",
    async () => {
      await generate_random_shopping_mall_admin_categories_create(
        adminConnection,
        {
          body: {
            name: categoryName,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            parent_id: null,
          },
        },
      );
    },
  );
}
