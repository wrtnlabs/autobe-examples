import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

export async function test_api_category_update_name_duplicate_within_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a top-level parent category
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  // 3. Create first subcategory under the parent with a unique name
  const subcategory1Name = RandomGenerator.paragraph({ sentences: 2 });
  const subcategory1 =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: subcategory1Name,
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory1);
  // 4. Create second subcategory under the same parent with a different name
  const subcategory2Name = RandomGenerator.paragraph({ sentences: 2 });
  const subcategory2 =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: subcategory2Name,
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory2);
  // 5. Attempt to rename second subcategory to first subcategory's name — expect 409 Conflict
  await TestValidator.error("duplicate name within parent scope", async () => {
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: subcategory2.id,
      body: {
        name: subcategory1Name,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  });
}
