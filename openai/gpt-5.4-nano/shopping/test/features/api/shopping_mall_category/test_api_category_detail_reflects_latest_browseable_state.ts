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

export async function test_api_category_detail_reflects_latest_browseable_state(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Scenario 1: active browseable category
  const scenario1Category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(scenario1Category);
  const scenario1Fetched: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.at(adminConnection, {
      categoryId: scenario1Category.id,
    });
  typia.assert(scenario1Fetched);
  TestValidator.equals(
    "category id matches",
    scenario1Fetched.id,
    scenario1Category.id,
  );
  TestValidator.equals(
    "category name matches",
    scenario1Fetched.name,
    scenario1Category.name,
  );
  TestValidator.equals(
    "category description matches",
    scenario1Fetched.description,
    scenario1Category.description,
  );
  TestValidator.equals(
    "category slug matches",
    scenario1Fetched.slug,
    scenario1Category.slug,
  );
  TestValidator.equals(
    "category visibility matches",
    scenario1Fetched.visibility,
    scenario1Category.visibility,
  );
  TestValidator.equals(
    "category display_order matches",
    scenario1Fetched.display_order,
    scenario1Category.display_order,
  );
  TestValidator.equals(
    "category deleted_at is null",
    scenario1Fetched.deleted_at,
    null,
  );
  // Scenario 2: reflection after admin edit
  const scenario2Category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(scenario2Category);
  const updatedName = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  await api.functional.shoppingMall.admin.categories
    .update(adminConnection, {
      categoryId: scenario2Category.id,
      body: {
        name: updatedName,
        description: updatedDescription,
      } satisfies IShoppingMallCategory.IUpdate,
    })
    .then((r) => typia.assert(r));
  const scenario2Fetched: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.at(adminConnection, {
      categoryId: scenario2Category.id,
    });
  typia.assert(scenario2Fetched);
  TestValidator.equals(
    "id stable after update",
    scenario2Fetched.id,
    scenario2Category.id,
  );
  TestValidator.equals(
    "name reflects update",
    scenario2Fetched.name,
    updatedName,
  );
  TestValidator.equals(
    "description reflects update",
    scenario2Fetched.description,
    updatedDescription,
  );
  TestValidator.equals(
    "slug stable after update",
    scenario2Fetched.slug,
    scenario2Category.slug,
  );
  TestValidator.equals(
    "display_order stable after update",
    scenario2Fetched.display_order,
    scenario2Category.display_order,
  );
  TestValidator.equals(
    "parent_category_id stable after update",
    scenario2Fetched.parent_category_id,
    scenario2Category.parent_category_id,
  );
  // Scenario 3: deleted treated as not found
  const scenario3Category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(scenario3Category);
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: scenario3Category.id,
  });
  await TestValidator.httpError(
    "deleted category should be not found",
    404,
    async () => {
      await api.functional.shoppingMall.admin.categories.at(adminConnection, {
        categoryId: scenario3Category.id,
      });
    },
  );
}
