import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategorySnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
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

export async function test_api_category_snapshot_list_administrator_browse(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(administrator);
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `category-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: null,
        },
      },
    );
  typia.assert(category);
  TestValidator.equals("created category is top-level", category.parent, null);
  TestValidator.equals(
    "created category remains active",
    category.deleted_at,
    null,
  );
  const snapshots =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      administratorConnection,
      {
        categoryId: category.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "snapshot pagination current page is at least first page",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "snapshot pagination limit is non-negative",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "snapshot pagination record count covers returned data length",
    snapshots.pagination.records >= snapshots.data.length,
  );
  TestValidator.predicate(
    "snapshot pagination total pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  if (snapshots.pagination.limit > 0) {
    TestValidator.equals(
      "snapshot pagination pages matches records and limit",
      snapshots.pagination.pages,
      Math.ceil(snapshots.pagination.records / snapshots.pagination.limit),
    );
  }
  TestValidator.predicate(
    "at least one snapshot exists for the created category",
    snapshots.data.length >= 1,
  );
  snapshots.data.forEach((snapshot, index) => {
    TestValidator.equals(
      `snapshot ${index} belongs to requested category`,
      snapshot.category.id,
      category.id,
    );
    TestValidator.equals(
      `snapshot ${index} category name matches created category`,
      snapshot.category.name,
      category.name,
    );
    TestValidator.equals(
      `snapshot ${index} category description matches created category`,
      snapshot.category.description,
      category.description,
    );
    TestValidator.equals(
      `snapshot ${index} category parent matches top-level category`,
      snapshot.category.parent,
      null,
    );
    TestValidator.equals(
      `snapshot ${index} category created timestamp matches created category`,
      snapshot.category.created_at,
      category.created_at,
    );
    TestValidator.equals(
      `snapshot ${index} category updated timestamp matches created category`,
      snapshot.category.updated_at,
      category.updated_at,
    );
    TestValidator.equals(
      `snapshot ${index} category deletion state remains active`,
      snapshot.category.deleted_at,
      category.deleted_at,
    );
    TestValidator.predicate(
      `snapshot ${index} change summary is not empty`,
      snapshot.change_summary.trim().length > 0,
    );
  });
  for (let i = 1; i < snapshots.data.length; ++i) {
    TestValidator.predicate(
      `snapshots are ordered newest first between items ${i - 1} and ${i}`,
      new Date(snapshots.data[i - 1].created_at).getTime() >=
        new Date(snapshots.data[i].created_at).getTime(),
    );
  }
}
