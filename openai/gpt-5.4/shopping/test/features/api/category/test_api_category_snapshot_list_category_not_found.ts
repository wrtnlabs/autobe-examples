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

export async function test_api_category_snapshot_list_category_not_found(
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
  const originalCategory = {
    id: category.id,
    name: category.name,
    description: category.description,
    parent: category.parent,
    children: category.children,
    created_at: category.created_at,
    updated_at: category.updated_at,
    deleted_at: category.deleted_at,
  } satisfies IShoppingMallCategory;
  const missingCategoryCandidate = typia.random<string & tags.Format<"uuid">>();
  const missingCategoryId =
    missingCategoryCandidate === category.id
      ? typia.random<string & tags.Format<"uuid">>()
      : missingCategoryCandidate;
  const request = {
    page: 1,
    limit: 10,
    sort: "created_at.desc",
  } satisfies IShoppingMallCategorySnapshot.IRequest;
  await TestValidator.httpError(
    "snapshot list rejects nonexistent category",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.categories.snapshots.index(
        administratorConnection,
        {
          categoryId: missingCategoryId,
          body: request,
        },
      );
    },
  );
  const existingSnapshots =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      administratorConnection,
      {
        categoryId: category.id,
        body: request,
      },
    );
  typia.assert(existingSnapshots);
  TestValidator.equals(
    "created category remains unchanged after failed lookup",
    category,
    originalCategory,
  );
  TestValidator.predicate(
    "existing category retains audit history",
    existingSnapshots.data.length > 0,
  );
  TestValidator.predicate(
    "all returned snapshots belong to created category",
    existingSnapshots.data.every(
      (snapshot) => snapshot.category.id === category.id,
    ),
  );
}
