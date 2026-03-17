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

export async function test_api_category_update_top_level_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a top-level category (no parent_id)
  const createdCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Electronics",
          description: "Electronic goods",
        },
      },
    );
  typia.assert(createdCategory);
  // 3. Update the category name and description
  const updatedName = "Consumer Electronics";
  const updatedDescription = "All consumer electronic products";
  const updatedCategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: createdCategory.id,
      body: {
        name: updatedName,
        description: updatedDescription,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(updatedCategory);
  // 4. Validate the updated fields
  TestValidator.equals(
    "category id unchanged",
    updatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name updated",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "category description updated",
    updatedCategory.description,
    updatedDescription,
  );
  TestValidator.equals(
    "parent_id is still null",
    updatedCategory.parent_id,
    null,
  );
  TestValidator.equals("parent is still null", updatedCategory.parent, null);
  TestValidator.predicate(
    "updated_at >= created_at",
    new Date(updatedCategory.updated_at) >=
      new Date(updatedCategory.created_at),
  );
  TestValidator.predicate(
    "children array exists",
    Array.isArray(updatedCategory.children),
  );
}
