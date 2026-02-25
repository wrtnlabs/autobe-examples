import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function test_api_category_update_name_uniqueness_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create first category
  const category1 = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: "Electronics",
        description: "Electronic products",
        parent_category_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category1);
  // 3. Create second category with same parent
  const category2 = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: "Books",
        description: "Book products",
        parent_category_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category2);
  // 4. Try to update category2's name to match category1's name
  // This should fail due to uniqueness constraint
  await TestValidator.error("duplicate category name", async () => {
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: category2.id,
      body: {
        name: category1.name, // This should violate uniqueness
      } satisfies IShoppingMallCategory.IUpdate,
    });
  });
  // 5. Verify category2 still has original name
  const updatedCategory2 =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: category2.id,
      body: {
        name: "Updated Books",
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(updatedCategory2);
  TestValidator.equals(
    "category2 name unchanged",
    updatedCategory2.name,
    "Updated Books",
  );
}
