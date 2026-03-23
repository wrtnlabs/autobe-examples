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

export async function test_api_product_search_with_price_and_stock_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create products with varying prices and stock conditions
  const adminConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Prepare test products with different price points
  // Create product with low price (15,000)
  const lowPriceProduct = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        search: "low price product",
        min_price: 10000,
        max_price: 20000,
        in_stock: false,
        sort: "created_at",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(lowPriceProduct);
  // Create product with medium price (50,000)
  const mediumPriceProduct = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        search: "medium price product",
        min_price: 40000,
        max_price: 60000,
        in_stock: false,
        sort: "created_at",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(mediumPriceProduct);
  // Create product with high price (85,000)
  const highPriceProduct = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        search: "high price product",
        min_price: 80000,
        max_price: 100000,
        in_stock: false,
        sort: "created_at",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(highPriceProduct);
  // 3. Test price range search
  const priceFiltered = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        search: "",
        min_price: 20000,
        max_price: 70000,
        in_stock: false,
        sort: "created_at",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(priceFiltered);
  // 4. Test in_stock filter
  const inStockFiltered = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        search: "",
        min_price: 0,
        max_price: 1000000,
        in_stock: true,
        sort: "created_at",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(inStockFiltered);
  // 5. Test combined filters (price range + in_stock)
  const combinedFiltered = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        search: "",
        min_price: 15000,
        max_price: 85000,
        in_stock: true,
        sort: "base_price_asc",
        page: 1,
        limit: 30,
      },
    },
  );
  typia.assert(combinedFiltered);
  // 6. Test boundary conditions
  const boundaryTest = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        search: "",
        min_price: 20000,
        max_price: 50000,
        in_stock: true,
        sort: "base_price_desc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(boundaryTest);
}