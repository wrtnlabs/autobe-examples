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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_browsing_pagination_active_hierarchy(
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
  const topLevelInput = {
    name: `top-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parentId: null,
  } satisfies IShoppingMallCategory.ICreate;
  const topLevel =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: topLevelInput,
      },
    );
  typia.assert(topLevel);
  const subcategoryInput = {
    name: `sub-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parentId: topLevel.id,
  } satisfies IShoppingMallCategory.ICreate;
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: subcategoryInput,
      },
    );
  typia.assert(subcategory);
  const paged =
    await api.functional.shoppingMall.administrator.categories.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 1,
          sort: "+name",
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "paged current matches request",
    paged.pagination.current,
    1,
  );
  TestValidator.equals(
    "paged limit matches request",
    paged.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "paged data length does not exceed limit",
    paged.data.length <= paged.pagination.limit,
  );
  TestValidator.predicate(
    "paged records cover returned data length",
    paged.pagination.records >= paged.data.length,
  );
  TestValidator.equals(
    "paged pages follow record math",
    paged.pagination.pages,
    paged.pagination.records === 0
      ? 0
      : Math.ceil(paged.pagination.records / paged.pagination.limit),
  );
  const browsingLookup =
    await api.functional.shoppingMall.administrator.categories.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "+name",
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(browsingLookup);
  TestValidator.equals(
    "browsing lookup current matches request",
    browsingLookup.pagination.current,
    1,
  );
  TestValidator.equals(
    "browsing lookup limit matches request",
    browsingLookup.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "browsing lookup data length does not exceed limit",
    browsingLookup.data.length <= browsingLookup.pagination.limit,
  );
  TestValidator.predicate(
    "browsing lookup records cover returned data length",
    browsingLookup.pagination.records >= browsingLookup.data.length,
  );
  TestValidator.equals(
    "browsing lookup pages follow record math",
    browsingLookup.pagination.pages,
    browsingLookup.pagination.records === 0
      ? 0
      : Math.ceil(
          browsingLookup.pagination.records / browsingLookup.pagination.limit,
        ),
  );
  TestValidator.predicate(
    "created categories appear in browsing lookup",
    ArrayUtil.has(
      browsingLookup.data,
      (category) =>
        category.id === topLevel.id || category.id === subcategory.id,
    ),
  );
  const topLevelPage =
    await api.functional.shoppingMall.administrator.categories.index(
      administratorConnection,
      {
        body: {
          isTopLevel: true,
          page: 1,
          limit: 100,
          sort: "+name",
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(topLevelPage);
  TestValidator.equals(
    "top-level page current matches request",
    topLevelPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "top-level page limit matches request",
    topLevelPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "top-level page data length does not exceed limit",
    topLevelPage.data.length <= topLevelPage.pagination.limit,
  );
  TestValidator.predicate(
    "top-level page records cover returned data length",
    topLevelPage.pagination.records >= topLevelPage.data.length,
  );
  TestValidator.equals(
    "top-level page pages follow record math",
    topLevelPage.pagination.pages,
    topLevelPage.pagination.records === 0
      ? 0
      : Math.ceil(
          topLevelPage.pagination.records / topLevelPage.pagination.limit,
        ),
  );
  const topLevelSummary = topLevelPage.data.find(
    (category) => category.id === topLevel.id,
  );
  TestValidator.predicate(
    "top-level category appears in active browsing list",
    topLevelSummary !== undefined,
  );
  TestValidator.equals(
    "top-level id matches",
    topLevelSummary!.id,
    topLevel.id,
  );
  TestValidator.equals(
    "top-level name matches",
    topLevelSummary!.name,
    topLevel.name,
  );
  TestValidator.equals(
    "top-level description matches",
    topLevelSummary!.description,
    topLevel.description,
  );
  TestValidator.equals(
    "top-level parent is null",
    topLevelSummary!.parent,
    null,
  );
  TestValidator.equals(
    "top-level category remains active",
    topLevelSummary!.deleted_at,
    null,
  );
  const subcategoryPage =
    await api.functional.shoppingMall.administrator.categories.index(
      administratorConnection,
      {
        body: {
          parent_id: topLevel.id,
          isSubcategory: true,
          page: 1,
          limit: 100,
          sort: "+name",
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(subcategoryPage);
  TestValidator.equals(
    "subcategory page current matches request",
    subcategoryPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "subcategory page limit matches request",
    subcategoryPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "subcategory page data length does not exceed limit",
    subcategoryPage.data.length <= subcategoryPage.pagination.limit,
  );
  TestValidator.predicate(
    "subcategory page records cover returned data length",
    subcategoryPage.pagination.records >= subcategoryPage.data.length,
  );
  TestValidator.equals(
    "subcategory page pages follow record math",
    subcategoryPage.pagination.pages,
    subcategoryPage.pagination.records === 0
      ? 0
      : Math.ceil(
          subcategoryPage.pagination.records / subcategoryPage.pagination.limit,
        ),
  );
  const subcategorySummary = subcategoryPage.data.find(
    (category) => category.id === subcategory.id,
  );
  TestValidator.predicate(
    "subcategory appears in active browsing list",
    subcategorySummary !== undefined,
  );
  TestValidator.equals(
    "subcategory id matches",
    subcategorySummary!.id,
    subcategory.id,
  );
  TestValidator.equals(
    "subcategory name matches",
    subcategorySummary!.name,
    subcategory.name,
  );
  TestValidator.equals(
    "subcategory description matches",
    subcategorySummary!.description,
    subcategory.description,
  );
  TestValidator.notEquals(
    "subcategory parent is populated",
    subcategorySummary!.parent,
    null,
  );
  TestValidator.equals(
    "subcategory remains active",
    subcategorySummary!.deleted_at,
    null,
  );
  TestValidator.equals(
    "subcategory parent id matches top-level category",
    subcategorySummary!.parent!.id,
    topLevel.id,
  );
  TestValidator.equals(
    "subcategory parent name matches top-level category",
    subcategorySummary!.parent!.name,
    topLevel.name,
  );
  TestValidator.equals(
    "subcategory parent description matches top-level category",
    subcategorySummary!.parent!.description,
    topLevel.description,
  );
  TestValidator.equals(
    "subcategory parent parent is null for one-level hierarchy",
    subcategorySummary!.parent!.parent,
    null,
  );
}
