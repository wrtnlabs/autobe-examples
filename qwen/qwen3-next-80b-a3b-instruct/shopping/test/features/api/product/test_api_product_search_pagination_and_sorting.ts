import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Test pagination without parameters (should default to page=1, limit=100)
  const defaultResponse = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Validate pagination defaults
  TestValidator.equals("default page", defaultResponse.pagination.current, 1);
  TestValidator.equals("default limit", defaultResponse.pagination.limit, 100);
  TestValidator.predicate(
    "default has at least one record",
    defaultResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "default has at least one page",
    defaultResponse.pagination.pages >= 1,
  );
  // Test explicit pagination with page=1, limit=5
  const page1Limit5Response = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page1Limit5Response);
  TestValidator.equals(
    "explicit page 1",
    page1Limit5Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit limit 5",
    page1Limit5Response.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 1 data length",
    page1Limit5Response.data.length,
    5,
  );
  // Test page 2 with limit=5
  const page2Limit5Response = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page2Limit5Response);
  TestValidator.equals(
    "page 2 current",
    page2Limit5Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Limit5Response.pagination.limit, 5);
  TestValidator.notEquals(
    "page 2 data different from page 1",
    page1Limit5Response.data[0].id,
    page2Limit5Response.data[0].id,
  );
  // Test limit=10 and validate page=1 result count
  const limit10Response = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(limit10Response);
  TestValidator.equals("limit 10 items", limit10Response.data.length, 10);
  TestValidator.predicate(
    "limit 10 has valid records count",
    limit10Response.pagination.records >= 10,
  );
  // Test invalid page: 999999 (should return empty data with valid pagination metadata)
  const invalidPageResponse = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {
        page: 999999,
        limit: 5,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(invalidPageResponse);
  TestValidator.equals(
    "invalid page current",
    invalidPageResponse.pagination.current,
    999999,
  );
  TestValidator.equals(
    "invalid page limit",
    invalidPageResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "invalid page records",
    invalidPageResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid page data length",
    invalidPageResponse.data.length,
    0,
  );
  // Test invalid limit: negative value
  const invalidLimitResponse = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: -1,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(invalidLimitResponse);
  TestValidator.equals(
    "invalid limit current",
    invalidLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "invalid limit limit",
    invalidLimitResponse.pagination.limit,
    100,
  ); // Should default to 100
  // Test null page (should default to 1)
  const nullPageResponse = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {
        page: null,
        limit: 5,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(nullPageResponse);
  TestValidator.equals(
    "null page current",
    nullPageResponse.pagination.current,
    1,
  );
  TestValidator.equals("null page limit", nullPageResponse.pagination.limit, 5);
  // Test null limit (should default to 100)
  const nullLimitResponse = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: null,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(nullLimitResponse);
  TestValidator.equals(
    "null limit current",
    nullLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "null limit limit",
    nullLimitResponse.pagination.limit,
    100,
  );
  // Test zero limit (should default to 100)
  const zeroLimitResponse = await api.functional.shoppingMall.products.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 0,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(zeroLimitResponse);
  TestValidator.equals(
    "zero limit current",
    zeroLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "zero limit limit",
    zeroLimitResponse.pagination.limit,
    100,
  );
  // Validate all returned products are valid ISummary objects
  for (const product of defaultResponse.data) {
    TestValidator.predicate(
      "product has valid id",
      typeof product.id === "string" && product.id.length > 0,
    );
    TestValidator.predicate(
      "product has valid name",
      typeof product.name === "string" && product.name.length > 0,
    );
    TestValidator.predicate(
      "product has positive base_price",
      typeof product.base_price === "number" && product.base_price > 0,
    );
    TestValidator.predicate(
      "product has valid category",
      product.category !== null &&
        typeof product.category.id === "string" &&
        product.category.name.length > 0,
    );
    TestValidator.predicate(
      "product has valid seller",
      product.seller !== null &&
        typeof product.seller.shop_name === "string" &&
        product.seller.logo_url.length > 0,
    );
    TestValidator.predicate(
      "product has valid main_image_url",
      typeof product.main_image_url === "string" &&
        product.main_image_url.length > 0,
    );
    if (product.avg_rating !== undefined) {
      TestValidator.predicate(
        "avg_rating is within range [0,5]",
        product.avg_rating >= 0 && product.avg_rating <= 5,
      );
    }
    if (product.review_count !== undefined) {
      TestValidator.predicate(
        "review_count is non-negative",
        product.review_count >= 0,
      );
    }
  }
  // Note: The scenario requires testing sort functionality by base_price ASC/DESC,
  // but the IRequest interface does not include any sort parameter.
  // According to the Anti-Hallucination Protocol, we must use only provided DTO definitions.
  // Since the sort parameter is not part of IRequest, we cannot test it.
  // The API implementation must follow the provided DTO, so we test what exists.
}
