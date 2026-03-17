import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_ecommerce_mall_products_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Sort by newest (default) - verify API accepts parameter and returns valid data
  const newestResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        sort: "newest",
        limit: 50,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(newestResult);
  // Test 2: Sort by price ascending - verify products ordered from lowest to highest price
  const priceAscResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        sort: "price_asc",
        limit: 50,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceAscResult);
  // Validate ascending price order using priceRangeMin
  TestValidator.predicate(
    "price_asc sorts products from lowest to highest price",
    () => {
      for (let i = 1; i < priceAscResult.data.length; i++) {
        const prevPrice = priceAscResult.data[i - 1].priceRangeMin;
        const currPrice = priceAscResult.data[i].priceRangeMin;
        if (prevPrice > currPrice) return false;
      }
      return true;
    },
  );
  // Test 3: Sort by price descending - verify products ordered from highest to lowest price
  const priceDescResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        sort: "price_desc",
        limit: 50,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceDescResult);
  // Validate descending price order using priceRangeMin
  TestValidator.predicate(
    "price_desc sorts products from highest to lowest price",
    () => {
      for (let i = 1; i < priceDescResult.data.length; i++) {
        const prevPrice = priceDescResult.data[i - 1].priceRangeMin;
        const currPrice = priceDescResult.data[i].priceRangeMin;
        if (prevPrice < currPrice) return false;
      }
      return true;
    },
  );
  // Verify that different sort parameters produce different orderings when prices differ
  TestValidator.notEquals(
    "price_asc and price_desc produce different orderings",
    priceAscResult.data.map((p) => p.id),
    priceDescResult.data.map((p) => p.id),
  );
}
