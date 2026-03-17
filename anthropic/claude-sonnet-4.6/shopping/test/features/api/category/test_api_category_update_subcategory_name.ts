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

export async function test_api_category_update_subcategory_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create top-level parent category
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Clothing",
          description: "All clothing items",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory under the parent category
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
          name: "Men Wear",
          description: "Clothing for men",
        },
      },
    );
  typia.assert(subcategory);
  // 4. Update subcategory's name and description
  const updated = await api.functional.shoppingMall.admin.categories.update(
    adminConnection,
    {
      categoryId: subcategory.id,
      body: {
        name: "Men Clothing",
        description: "All clothing items for men",
      } satisfies IShoppingMallCategory.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Validate response
  TestValidator.equals("subcategory id unchanged", updated.id, subcategory.id);
  TestValidator.equals("updated name", updated.name, "Men Clothing");
  TestValidator.equals(
    "updated description",
    updated.description,
    "All clothing items for men",
  );
  TestValidator.predicate(
    "parent_id non-null and matches",
    updated.parent_id === parentCategory.id,
  );
  TestValidator.predicate("parent non-null", updated.parent !== null);
  TestValidator.predicate(
    "parent id matches",
    updated.parent !== null && updated.parent.id === parentCategory.id,
  );
  TestValidator.equals("children is empty", updated.children.length, 0);
  TestValidator.predicate(
    "updated_at >= created_at",
    updated.updated_at >= updated.created_at,
  );
}
