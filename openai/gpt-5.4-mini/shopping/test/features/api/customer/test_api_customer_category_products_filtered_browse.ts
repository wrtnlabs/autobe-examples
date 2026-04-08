import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_category_products_filtered_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const pageLimit = 7;
  const baseRequest = {
    page: 1,
    limit: pageLimit,
  } satisfies IMallPlatformProduct.IRequest;
  const page1 =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId,
        body: baseRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, pageLimit);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 data length within limit",
    page1.data.length <= pageLimit,
  );
  const keyword = RandomGenerator.alphabets(8);
  const keywordPage =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId,
        body: {
          ...baseRequest,
          search: keyword,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(keywordPage);
  TestValidator.equals(
    "keyword page current",
    keywordPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "keyword page limit",
    keywordPage.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "keyword page data length within limit",
    keywordPage.data.length <= pageLimit,
  );
  TestValidator.predicate(
    "keyword page records are not negative",
    keywordPage.pagination.records >= 0 && keywordPage.pagination.pages >= 0,
  );
  const sortedNewest =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId,
        body: {
          ...baseRequest,
          sort: "newest",
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(sortedNewest);
  TestValidator.predicate(
    "newest sort is non-increasing by createdAt",
    sortedNewest.data.every(
      (product, index, array) =>
        index === 0 || array[index - 1]!.createdAt >= product.createdAt,
    ),
  );
  const sortedPriceAsc =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId,
        body: {
          ...baseRequest,
          sort: "priceAsc",
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(sortedPriceAsc);
  TestValidator.predicate(
    "price asc is non-decreasing by base price",
    sortedPriceAsc.data.every(
      (product, index, array) =>
        index === 0 || array[index - 1]!.basePrice <= product.basePrice,
    ),
  );
  const sortedPriceDesc =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId,
        body: {
          ...baseRequest,
          sort: "priceDesc",
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(sortedPriceDesc);
  TestValidator.predicate(
    "price desc is non-increasing by base price",
    sortedPriceDesc.data.every(
      (product, index, array) =>
        index === 0 || array[index - 1]!.basePrice >= product.basePrice,
    ),
  );
  const priceFiltered =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId,
        body: {
          ...baseRequest,
          minPrice: 1000,
          maxPrice: 100000,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(priceFiltered);
  TestValidator.predicate(
    "price filter respects minimum",
    priceFiltered.data.every((product) => product.basePrice >= 1000),
  );
  TestValidator.predicate(
    "price filter respects maximum",
    priceFiltered.data.every((product) => product.basePrice <= 100000),
  );
  const inStockOnly =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId,
        body: {
          ...baseRequest,
          inStockOnly: true,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(inStockOnly);
  TestValidator.predicate(
    "in-stock-only data length within limit",
    inStockOnly.data.length <= pageLimit,
  );
  TestValidator.predicate(
    "in-stock-only pagination metadata is valid",
    inStockOnly.pagination.records >= 0 && inStockOnly.pagination.pages >= 0,
  );
  const secondPage =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId,
        body: {
          ...baseRequest,
          page: 2,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals(
    "second page limit",
    secondPage.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "second page data length within limit",
    secondPage.data.length <= pageLimit,
  );
  TestValidator.predicate(
    "pagination metadata is consistent with records",
    page1.pagination.pages === 0
      ? page1.pagination.records === 0
      : page1.pagination.records > 0,
  );
  TestValidator.predicate(
    "filtered pagination metadata remains non-negative",
    keywordPage.pagination.records >= 0 &&
      priceFiltered.pagination.records >= 0 &&
      inStockOnly.pagination.records >= 0,
  );
}
