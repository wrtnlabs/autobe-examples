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

export async function test_api_category_subcategory_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authorized category operations
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. Create parent category first
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: typia.random<DeepPartial<IShoppingMallCategory.ICreate>>(),
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory under the parent category
  const subcategory =
    await generate_random_shopping_mall_admin_categories_subcategories_create(
      adminConnection,
      {
        params: {
          categoryId: "00000000-0000-0000-0000-000000000000",
        },
        body: typia.random<DeepPartial<IShoppingMallSubcategory.ICreate>>(),
      },
    );
  typia.assert(subcategory);
}
