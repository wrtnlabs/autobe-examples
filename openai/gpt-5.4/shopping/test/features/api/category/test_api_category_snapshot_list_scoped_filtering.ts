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

export async function test_api_category_snapshot_list_scoped_filtering(
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
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const primaryCategoryName = `scope-${RandomGenerator.alphabets(8)}`;
  const secondaryCategoryName = `other-${RandomGenerator.alphabets(8)}`;
  const primaryCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: primaryCategoryName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(primaryCategory);
  const secondaryCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: secondaryCategoryName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(secondaryCategory);
  const searchToken = primaryCategoryName;
  const createdAtFrom = new Date(
    new Date(primaryCategory.created_at).getTime() - 60000,
  ).toISOString();
  const createdAtTo = new Date(
    new Date(primaryCategory.created_at).getTime() + 60000,
  ).toISOString();
  const page = 1;
  const limit = 10;
  const snapshots =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      administratorConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          search: searchToken,
          sort: "created_at.asc",
          page,
          limit,
          createdAtFrom,
          createdAtTo,
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "pagination current matches request",
    snapshots.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    snapshots.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "snapshot count is within requested page limit",
    snapshots.data.length <= limit,
  );
  TestValidator.predicate(
    "all snapshots belong to the requested primary category",
    snapshots.data.every(
      (snapshot) => snapshot.category.id === primaryCategory.id,
    ),
  );
  TestValidator.predicate(
    "secondary category snapshots are excluded from the scoped history",
    snapshots.data.every(
      (snapshot) => snapshot.category.id !== secondaryCategory.id,
    ),
  );
  TestValidator.predicate(
    "returned snapshots stay within the requested date range",
    snapshots.data.every(
      (snapshot) =>
        new Date(snapshot.created_at).getTime() >=
          new Date(createdAtFrom).getTime() &&
        new Date(snapshot.created_at).getTime() <=
          new Date(createdAtTo).getTime(),
    ),
  );
  TestValidator.predicate(
    "ascending chronological sort is honored",
    snapshots.data.every((snapshot, index, array) => {
      if (index === 0) return true;
      return (
        new Date(array[index - 1].created_at).getTime() <=
        new Date(snapshot.created_at).getTime()
      );
    }),
  );
}
