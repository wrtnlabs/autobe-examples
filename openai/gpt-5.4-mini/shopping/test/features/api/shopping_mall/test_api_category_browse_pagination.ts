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

export async function test_api_category_browse_pagination(
  connection: api.IConnection,
): Promise<void> {
  const firstPage = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
        parent_id: null,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination current page is at least 1",
    firstPage.pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination limit echoes request",
    firstPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "category list page length is within requested limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  for (const category of firstPage.data) {
    typia.assert(category);
    TestValidator.equals(
      "top-level category has no parent",
      category.parent,
      null,
    );
    TestValidator.equals(
      "active category has no deleted_at",
      category.deleted_at,
      null,
    );
  }
  const secondPage = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 2,
        limit: 1,
        parent_id: null,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page uses requested page size",
    secondPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "second page pagination remains valid",
    secondPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "second page data length is within requested limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  for (const category of secondPage.data) {
    typia.assert(category);
    TestValidator.equals(
      "top-level category has no parent",
      category.parent,
      null,
    );
    TestValidator.equals(
      "active category has no deleted_at",
      category.deleted_at,
      null,
    );
  }
  const emptyPage = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 999999,
        limit: 100,
        parent_id: null,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page preserves requested limit",
    emptyPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "empty page returns valid pagination metadata",
    emptyPage.pagination.current >= 1 &&
      emptyPage.pagination.pages >= 0 &&
      emptyPage.pagination.records >= 0,
  );
  TestValidator.equals("empty page has no data", emptyPage.data.length, 0);
}
