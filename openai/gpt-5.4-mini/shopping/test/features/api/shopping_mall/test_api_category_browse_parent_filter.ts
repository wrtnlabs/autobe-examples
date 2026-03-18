import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_browse_parent_filter(
  connection: api.IConnection,
): Promise<void> {
  const browseConnection: api.IConnection = { host: connection.host };
  const topLevelPage = await api.functional.shoppingMall.categories.index(
    browseConnection,
    {
      body: {
        page: 1,
        limit: 100,
        parent_id: null,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(topLevelPage);
  TestValidator.predicate(
    "top-level browse should only return categories without a parent",
    topLevelPage.data.every((category) => category.parent === null),
  );
  const topLevelCategories = topLevelPage.data.filter(
    (category) => category.parent === null,
  );
  TestValidator.equals(
    "top-level browse should not include any subcategories",
    topLevelPage.data,
    topLevelCategories,
  );
  const parentCategory = topLevelCategories[0] ?? null;
  TestValidator.predicate(
    "category browsing requires at least one top-level category for hierarchy validation",
    parentCategory !== null,
  );
  if (parentCategory === null) return;
  const subcategoryPage = await api.functional.shoppingMall.categories.index(
    browseConnection,
    {
      body: {
        page: 1,
        limit: 100,
        parent_id: parentCategory.id,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(subcategoryPage);
  TestValidator.predicate(
    "filtered subcategories should not include top-level categories",
    subcategoryPage.data.every((category) => category.parent !== null),
  );
  TestValidator.predicate(
    "filtered subcategories should reference the requested parent",
    subcategoryPage.data.every(
      (category) =>
        category.parent !== null && category.parent.id === parentCategory.id,
    ),
  );
  const directSubcategories = subcategoryPage.data.filter((category) => {
    if (category.parent === null) return false;
    return category.parent.id === parentCategory.id;
  });
  TestValidator.equals(
    "filtered browse should only return direct subcategories of the selected parent",
    subcategoryPage.data,
    directSubcategories,
  );
}
