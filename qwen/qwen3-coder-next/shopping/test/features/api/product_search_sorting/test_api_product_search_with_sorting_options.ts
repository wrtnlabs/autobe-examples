import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_with_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Test sorting by newest first (created_at)
  const newestOutput: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        search: "test",
        sort: "created_at",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(newestOutput);
  // Test sorting by price ascending (base_price_asc)
  const priceAscOutput: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        search: "test",
        sort: "base_price_asc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(priceAscOutput);
  // Test sorting by price descending (base_price_desc)
  const priceDescOutput: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        search: "test",
        sort: "base_price_desc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(priceDescOutput);
  // Test sorting with category filter
  const categoryFilteredOutput: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        search: "test",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        sort: "base_price_asc",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(categoryFilteredOutput);
  // Test sorting with price range filter
  const priceRangeOutput: IPageIEcommerceMallCustomer.ISummary =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        search: "test",
        min_price: 1000,
        max_price: 100000,
        sort: "base_price_desc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(priceRangeOutput);
}
