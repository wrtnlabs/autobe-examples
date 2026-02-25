import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test first page with limit 20
  const firstPage = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  // Test second page with limit 20
  const secondPage = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 2,
        limit: 20,
      },
    },
  );
  // Test empty results
  const emptyResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  // Test exact page size scenario
  const exactPageSize = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
}
