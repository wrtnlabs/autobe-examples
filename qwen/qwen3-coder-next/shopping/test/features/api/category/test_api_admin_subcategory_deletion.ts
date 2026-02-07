import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_admin_categories_subcategories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_subcategories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_subcategory } from "../../../prepare/prepare_random_shopping_mall_subcategory";

export async function test_api_admin_subcategory_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      name: "Admin User",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create parent category
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: { name: "Test Category" } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // Ensure category has ID by type assertion
  const categoryId = (
    category as {
      id: string;
    }
  ).id;
  if (!categoryId) throw new Error("Category ID is missing");
  // 3. Create subcategory
  const subcategory =
    await api.functional.shoppingMall.admin.categories.subcategories.create(
      adminConnection,
      {
        categoryId,
        body: {
          name: "Test Subcategory",
        } satisfies IShoppingMallSubcategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // Ensure subcategory has ID
  const subcategoryId = (
    subcategory as {
      id: string;
    }
  ).id;
  if (!subcategoryId) throw new Error("Subcategory ID is missing");
  // 4. Delete subcategory
  await api.functional.shoppingMall.admin.categories.subcategories.erase(
    adminConnection,
    {
      categoryId,
      subcategoryId,
    },
  );
}
