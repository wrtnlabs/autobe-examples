import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_top_level_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create top-level category (parent_id: null)
  const categoryName = RandomGenerator.name();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const category =
    await api.functional.shoppingMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
          parent_id: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Verify response data matches input
  TestValidator.equals("category name matches", category.name, categoryName);
  TestValidator.equals(
    "category description matches",
    category.description,
    categoryDescription,
  );
  TestValidator.equals(
    "parent is null for top-level category",
    category.parent,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active category",
    category.deleted_at,
    null,
  );
}
