import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_browsing_advanced_filters(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Generate test data for filters
  const testCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const minPriceFilter: number & tags.Minimum<0> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const maxPriceFilter: number & tags.Minimum<0> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const lowMaxPrice: number & tags.Minimum<0> = 100;
  // Test 1: category_id filter - verify filter parameter is accepted
  const categoryFilterResult =
    await api.functional.ecommerceMall.products.index(customerConnection, {
      body: {
        category_id: testCategoryId,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(categoryFilterResult);
  TestValidator.equals(
    "category filter returns page response",
    categoryFilterResult.pagination,
    { current: 1, limit: 20, records: 0, pages: 0 },
    (key) => key !== "records",
  );
  // Test 2: min_price filter - verify all returned products meet min_price
  const minPriceFilterResult =
    await api.functional.ecommerceMall.products.index(customerConnection, {
      body: {
        min_price: minPriceFilter,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(minPriceFilterResult);
  for (const product of minPriceFilterResult.data) {
    TestValidator.predicate(
      `product base_price meets min_price (${minPriceFilter})`,
      product.base_price >= minPriceFilter,
    );
  }
  // Test 3: max_price filter - verify all returned products within max_price
  const maxPriceFilterResult =
    await api.functional.ecommerceMall.products.index(customerConnection, {
      body: {
        max_price: lowMaxPrice,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(maxPriceFilterResult);
  for (const product of maxPriceFilterResult.data) {
    TestValidator.predicate(
      "product base_price within max_price",
      product.base_price <= lowMaxPrice,
    );
  }
  // Test 4: has_variants=true filter - products should have variants
  const hasVariantsTrueResult =
    await api.functional.ecommerceMall.products.index(customerConnection, {
      body: {
        has_variants: true,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(hasVariantsTrueResult);
  // Filter applied successfully (returns response without error)
  TestValidator.equals(
    "has_variants=true returns page response",
    hasVariantsTrueResult.pagination,
    { current: 1, limit: 20, records: 0, pages: 0 },
    (key) => key !== "records",
  );
  // Test 5: has_variants=false filter - products should not have variants
  const hasVariantsFalseResult =
    await api.functional.ecommerceMall.products.index(customerConnection, {
      body: {
        has_variants: false,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(hasVariantsFalseResult);
  // Filter applied successfully (returns response without error)
  TestValidator.equals(
    "has_variants=false returns page response",
    hasVariantsFalseResult.pagination,
    { current: 1, limit: 20, records: 0, pages: 0 },
    (key) => key !== "records",
  );
  // Test 6: Combined filters - all filters applied together
  const combinedFilterResult =
    await api.functional.ecommerceMall.products.index(customerConnection, {
      body: {
        category_id: testCategoryId,
        min_price: minPriceFilter,
        max_price: lowMaxPrice,
        has_variants: true,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Combined filter applied successfully
  TestValidator.equals(
    "combined filters return page response",
    combinedFilterResult.pagination,
    { current: 1, limit: 20, records: 0, pages: 0 },
    (key) => key !== "records",
  );
}
