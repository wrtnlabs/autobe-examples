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

export async function test_api_category_update_with_parent_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create root category
  const rootCategory =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_category_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(rootCategory);
  // 3. Create subcategory
  const subcategory = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_category_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(subcategory);
  // 4. Update subcategory to assign root category as parent
  const updatedSubcategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: subcategory.id,
      body: {
        name: subcategory.name,
        description: subcategory.description,
        parent_category_id: rootCategory.id,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(updatedSubcategory);
  // 5. Validate
  TestValidator.equals(
    "parent category matches",
    updatedSubcategory.parent_category?.id,
    rootCategory.id,
  );
  TestValidator.equals(
    "name preserved",
    updatedSubcategory.name,
    subcategory.name,
  );
  TestValidator.equals(
    "description preserved",
    updatedSubcategory.description,
    subcategory.description,
  );
}
