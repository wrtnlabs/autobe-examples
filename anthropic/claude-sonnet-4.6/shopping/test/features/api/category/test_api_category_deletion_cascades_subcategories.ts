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

export async function test_api_category_deletion_cascades_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create a top-level parent category (no parent_id)
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: `parent-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory 1 under the parent
  const subCategory1 =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
          name: `sub1-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(subCategory1);
  // 4. Create subcategory 2 under the parent
  const subCategory2 =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
          name: `sub2-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(subCategory2);
  // Verify subcategories have the correct parent_id
  TestValidator.equals(
    "sub1 parent_id matches",
    subCategory1.parent_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "sub2 parent_id matches",
    subCategory2.parent_id,
    parentCategory.id,
  );
  // 5. Delete the parent category - this should cascade delete all subcategories
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: parentCategory.id,
  });
  // 6. Verify the parent category is gone (attempting deletion again should throw error)
  await TestValidator.error(
    "parent category no longer exists after deletion",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(
        adminConnection,
        {
          categoryId: parentCategory.id,
        },
      );
    },
  );
  // 7. Verify subcategory 1 is also gone (cascade deletion)
  await TestValidator.error(
    "subcategory 1 no longer exists after parent deletion (cascade)",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(
        adminConnection,
        {
          categoryId: subCategory1.id,
        },
      );
    },
  );
  // 8. Verify subcategory 2 is also gone (cascade deletion)
  await TestValidator.error(
    "subcategory 2 no longer exists after parent deletion (cascade)",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(
        adminConnection,
        {
          categoryId: subCategory2.id,
        },
      );
    },
  );
}
