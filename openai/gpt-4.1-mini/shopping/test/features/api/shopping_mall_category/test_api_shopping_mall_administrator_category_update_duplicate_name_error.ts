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
import { generate_random_shopping_mall_administrator_categories_create_category } from "../../../generate/generate_random_shopping_mall_administrator_categories_create_category";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_shopping_mall_administrator_category_update_duplicate_name_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Attempt unauthorized update to verify auth enforcement
  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.shoppingMall.administrator.categories.updateCategory(
        connection,
        {
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          body: { name: "Unauthorized Update" },
        },
      );
    },
  );
  // 2. Administrator authenticates by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(6)}@example.com`,
      password: "Hello1234",
    },
  });
  // 3. Create initial category with a specific name, no parent (root category)
  const firstCategoryName = `Category-${RandomGenerator.alphabets(8)}`;
  const firstCategory =
    await generate_random_shopping_mall_administrator_categories_create_category(
      adminConnection,
      {
        body: {
          name: firstCategoryName,
          description: "Initial category",
          parentCategoryId: null,
        },
      },
    );
  typia.assert(firstCategory);
  // 4. Create second category with a different name but same parent (null)
  const secondCategoryName = `Category-${RandomGenerator.alphabets(8)}`;
  const secondCategory =
    await generate_random_shopping_mall_administrator_categories_create_category(
      adminConnection,
      {
        body: {
          name: secondCategoryName,
          description: "Second category",
          parentCategoryId: null,
        },
      },
    );
  typia.assert(secondCategory);
  // 5. Attempt to update the first category's name to the second category's name
  const updateBody: IShoppingMallCategory.IUpdate = {
    name: secondCategoryName,
  };
  // 6. Check that the API rejects with conflict error
  await TestValidator.error(
    "duplicate category name causes conflict",
    async () => {
      await api.functional.shoppingMall.administrator.categories.updateCategory(
        adminConnection,
        {
          categoryId: firstCategory.id,
          body: updateBody,
        },
      );
    },
  );
}
