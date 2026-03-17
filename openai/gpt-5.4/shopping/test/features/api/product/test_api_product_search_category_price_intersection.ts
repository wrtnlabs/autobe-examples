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

export async function test_api_product_search_category_price_intersection(
  connection: api.IConnection,
): Promise<void> {
  const storefrontConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const baselineRequest = {
    page: 1 satisfies number as number,
    limit: 100 satisfies number as number,
  } satisfies IShoppingMallProduct.IRequest;
  const baseline = await api.functional.shoppingMall.products.index(
    storefrontConnection,
    {
      body: baselineRequest,
    },
  );
  typia.assert(baseline);
  TestValidator.predicate(
    "baseline pagination record count covers returned data",
    baseline.pagination.records >= baseline.data.length,
  );
  const target = baseline.data.find((product) => product.category !== null);
  if (target === undefined) return;
  const category = target.category;
  if (category === null) return;
  const searchText = target.name;
  const normalizedSearch = searchText.toLowerCase();
  const categoryId = category.id;
  const minimumBasePrice = target.base_price;
  const maximumBasePrice = target.base_price;
  const matchesSearch = (product: IShoppingMallProduct.ISummary): boolean =>
    product.name.toLowerCase().includes(normalizedSearch) ||
    product.description.toLowerCase().includes(normalizedSearch);
  const matchesCategory = (product: IShoppingMallProduct.ISummary): boolean =>
    product.category?.id === categoryId;
  const matchesPrice = (product: IShoppingMallProduct.ISummary): boolean =>
    product.base_price >= minimumBasePrice &&
    product.base_price <= maximumBasePrice;
  const expected = baseline.data.filter(
    (product) =>
      matchesSearch(product) &&
      matchesCategory(product) &&
      matchesPrice(product),
  );
  if (expected.length === 0) return;
  const wrongCategoryMatches = baseline.data.filter(
    (product) => matchesSearch(product) && !matchesCategory(product),
  );
  const categoryButOutOfPriceRangeMatches = baseline.data.filter(
    (product) =>
      matchesSearch(product) &&
      matchesCategory(product) &&
      !matchesPrice(product),
  );
  if (
    wrongCategoryMatches.length === 0 ||
    categoryButOutOfPriceRangeMatches.length === 0
  )
    return;
  const filteredRequest = {
    search: searchText,
    category_id: categoryId,
    minimumBasePrice,
    maximumBasePrice,
    page: 1 satisfies number as number,
    limit: 100 satisfies number as number,
  } satisfies IShoppingMallProduct.IRequest;
  const filtered = await api.functional.shoppingMall.products.index(
    storefrontConnection,
    {
      body: filteredRequest,
    },
  );
  typia.assert(filtered);
  TestValidator.predicate(
    "filtered pagination record count covers returned data",
    filtered.pagination.records >= filtered.data.length,
  );
  for (const product of filtered.data) {
    TestValidator.predicate(
      "filtered product satisfies search/category/price intersection",
      matchesSearch(product) &&
        matchesCategory(product) &&
        matchesPrice(product),
    );
  }
  for (const product of expected) {
    TestValidator.predicate(
      "expected baseline intersection match is included",
      filtered.data.some((candidate) => candidate.id === product.id),
    );
  }
  for (const product of wrongCategoryMatches) {
    TestValidator.predicate(
      "search match with different or missing category is excluded",
      filtered.data.every((candidate) => candidate.id !== product.id),
    );
  }
  for (const product of categoryButOutOfPriceRangeMatches) {
    TestValidator.predicate(
      "category match outside inclusive base price bounds is excluded",
      filtered.data.every((candidate) => candidate.id !== product.id),
    );
  }
}
