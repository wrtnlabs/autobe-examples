import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
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

export async function test_api_category_browsing_parent_filter_one_level(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = ("admin_" +
    RandomGenerator.alphabets(10) +
    "@example.com") satisfies string & tags.Format<"email">;
  const adminPassword = ("Password!" +
    RandomGenerator.alphabets(6)) satisfies string & tags.Format<"password">;
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          slug: "parent-" + RandomGenerator.alphabets(12),
          visibility: typia.random<string>(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  const childCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_category_id: parentCategory.id,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          slug: "child-" + RandomGenerator.alphabets(12),
          visibility: parentCategory.visibility,
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(childCategory);
  // 1st browse: top-level only
  const topLevelPage = await api.functional.shoppingMall.admin.categories.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        parent_category_id: null,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(topLevelPage);
  TestValidator.predicate(
    "top-level result items should have null parent_category_id",
    topLevelPage.data.every((item) => item.parent_category_id === null),
  );
  TestValidator.predicate(
    "top-level result items should not be deleted",
    topLevelPage.data.every((item) => item.deleted_at === null),
  );
  const selectedParent = topLevelPage.data.find(
    (item) => item.deleted_at === null,
  );
  TestValidator.predicate(
    "must have at least one non-deleted top-level category",
    selectedParent !== undefined,
  );
  const parentId = typia.assert(selectedParent!.id);
  // 2nd browse: children of selected parent only
  const childPage = await api.functional.shoppingMall.admin.categories.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        parent_category_id: parentId,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(childPage);
  TestValidator.predicate(
    "child result items should have parent_category_id equal to selected parent",
    childPage.data.every((item) => item.parent_category_id === parentId),
  );
  TestValidator.predicate(
    "child result items should not be deleted",
    childPage.data.every((item) => item.deleted_at === null),
  );
  // Direct placement only: returned items must be direct children of selected parent.
  TestValidator.predicate(
    "child listing should reflect direct one-level parent placement only",
    childPage.data.every(
      (item) =>
        item.parent_category_id !== null &&
        item.parent_category_id === parentId,
    ),
  );
  TestValidator.predicate(
    "created child category should appear in its parent listing",
    childPage.data.some((item) => item.id === childCategory.id),
  );
}
