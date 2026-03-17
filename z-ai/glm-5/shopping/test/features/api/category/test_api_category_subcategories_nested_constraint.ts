import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
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
import { generate_random_shopping_mall_administrator_categories_subcategories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_subcategories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_subcategories_nested_constraint(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // Create a parent category (top-level)
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // Create a subcategory under the parent
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // Query subcategories of the subcategory (should return empty)
  const result =
    await api.functional.shoppingMall.categories.subcategories.index(
      connection,
      {
        categoryId: subcategory.id,
        body: {} satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(result);
  // Validate that subcategories cannot have their own children
  TestValidator.equals("data array is empty", result.data.length, 0);
  TestValidator.equals("records count is zero", result.pagination.records, 0);
  TestValidator.equals("pages count is zero", result.pagination.pages, 0);
}
