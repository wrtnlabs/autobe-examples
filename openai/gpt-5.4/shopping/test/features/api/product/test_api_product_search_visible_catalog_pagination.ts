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

export async function test_api_product_search_visible_catalog_pagination(
  connection: api.IConnection,
): Promise<void> {
  const anonymousConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const page = 1 satisfies number as number;
  const limit = 10 satisfies number as number;
  const baseline = await api.functional.shoppingMall.products.index(
    anonymousConnection,
    {
      body: {
        page,
        limit,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallProduct.ISummary>(baseline);
  TestValidator.predicate(
    "baseline pagination current page is non-negative",
    baseline.pagination.current >= 0,
  );
  TestValidator.predicate(
    "baseline pagination limit is non-negative",
    baseline.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "baseline page data length does not exceed limit",
    baseline.data.length <= baseline.pagination.limit,
  );
  TestValidator.predicate(
    "baseline record count is non-negative",
    baseline.pagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline page count is non-negative",
    baseline.pagination.pages >= 0,
  );
  for (const product of baseline.data) {
    TestValidator.equals(
      "visible catalog excludes soft-deleted products",
      product.deleted_at,
      null,
    );
    TestValidator.predicate(
      "visible catalog excludes suspended sellers",
      product.seller.suspended === false,
    );
    TestValidator.predicate(
      "visible catalog excludes banned sellers",
      product.seller.banned === false,
    );
  }
  const repeatedBaseline = await api.functional.shoppingMall.products.index(
    anonymousConnection,
    {
      body: {
        page,
        limit,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallProduct.ISummary>(repeatedBaseline);
  TestValidator.equals(
    "repeated baseline request returns stable ordered ids",
    repeatedBaseline.data.map((product) => product.id),
    baseline.data.map((product) => product.id),
  );
  if (baseline.data.length === 0) return;
  const target = baseline.data[0];
  const sourceText: string = `${target.name} ${target.description}`.trim();
  const tokenSource: string = sourceText.split(/\s+/)[0] ?? target.name;
  const normalizedToken: string = tokenSource.slice(
    0,
    Math.max(1, Math.min(8, tokenSource.length)),
  );
  const mixedCaseKeyword: string = `${normalizedToken.slice(0, 1).toUpperCase()}${normalizedToken.slice(1).toLowerCase()}`;
  const lowerKeyword: string = mixedCaseKeyword.toLowerCase();
  const upperKeyword: string = mixedCaseKeyword.toUpperCase();
  const mixed = await api.functional.shoppingMall.products.index(
    anonymousConnection,
    {
      body: {
        search: mixedCaseKeyword,
        page,
        limit,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallProduct.ISummary>(mixed);
  const lower = await api.functional.shoppingMall.products.index(
    anonymousConnection,
    {
      body: {
        search: lowerKeyword,
        page,
        limit,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallProduct.ISummary>(lower);
  const upper = await api.functional.shoppingMall.products.index(
    anonymousConnection,
    {
      body: {
        search: upperKeyword,
        page,
        limit,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert<IPageIShoppingMallProduct.ISummary>(upper);
  const mixedIds: string[] = mixed.data.map((product) => product.id);
  const lowerIds: string[] = lower.data.map((product) => product.id);
  const upperIds: string[] = upper.data.map((product) => product.id);
  TestValidator.predicate(
    "mixed-case search returns the discovered target product",
    mixedIds.includes(target.id),
  );
  TestValidator.predicate(
    "lower-case search returns the discovered target product",
    lowerIds.includes(target.id),
  );
  TestValidator.predicate(
    "upper-case search returns the discovered target product",
    upperIds.includes(target.id),
  );
  TestValidator.equals(
    "case-insensitive search lower-case ids match mixed-case ids",
    lowerIds,
    mixedIds,
  );
  TestValidator.equals(
    "case-insensitive search upper-case ids match mixed-case ids",
    upperIds,
    mixedIds,
  );
  for (const pageResult of [mixed, lower, upper]) {
    TestValidator.predicate(
      "searched page data length does not exceed limit",
      pageResult.data.length <= pageResult.pagination.limit,
    );
    for (const product of pageResult.data) {
      TestValidator.equals(
        "searched results exclude soft-deleted products",
        product.deleted_at,
        null,
      );
      TestValidator.predicate(
        "searched results exclude suspended sellers",
        product.seller.suspended === false,
      );
      TestValidator.predicate(
        "searched results exclude banned sellers",
        product.seller.banned === false,
      );
    }
  }
}
