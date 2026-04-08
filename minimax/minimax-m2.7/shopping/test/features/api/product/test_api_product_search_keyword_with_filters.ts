import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_keyword_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Search products with keyword, filters, and sorting
  const searchResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          q: "laptop",
          minPrice: 100,
          maxPrice: 500,
          inStock: true,
          sort: "newest",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination exists",
    searchResult.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(searchResult.data),
    true,
  );
  // 4. Validate pagination metadata - access via pagination.pagination (IPageIEcommerceMall.IPagination wraps IPage.IPagination)
  const pagination = searchResult.pagination
    .pagination satisfies IPage.IPagination;
  TestValidator.predicate("pagination has records", pagination.records >= 0);
  TestValidator.predicate("pagination has pages", pagination.pages >= 0);
  TestValidator.predicate(
    "pagination current is positive",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  // 5. Validate product summary fields in each item
  for (const product of searchResult.data) {
    TestValidator.predicate("product has id", product.id.length > 0);
    TestValidator.predicate("product has name", product.name.length > 0);
    TestValidator.predicate("product has basePrice", product.basePrice >= 0);
    TestValidator.predicate(
      "product has category",
      product.category !== null && product.category !== undefined,
    );
    TestValidator.predicate(
      "product has thumbnailUrl",
      product.thumbnailUrl.length > 0,
    );
    TestValidator.predicate(
      "product has minVariantPrice",
      product.minVariantPrice >= 0,
    );
    TestValidator.predicate(
      "product has maxVariantPrice",
      product.maxVariantPrice >= 0,
    );
    TestValidator.predicate(
      "product has hasStock",
      typeof product.hasStock === "boolean",
    );
    TestValidator.predicate(
      "product has shopName",
      product.shopName.length > 0,
    );
    TestValidator.predicate(
      "product has averageRating",
      product.averageRating >= 0 && product.averageRating <= 5,
    );
    TestValidator.predicate(
      "product has reviewsCount",
      product.reviewsCount >= 0,
    );
    TestValidator.predicate(
      "product has createdAt",
      product.createdAt.length > 0,
    );
    // 6. Validate price range (maxVariantPrice >= minVariantPrice)
    TestValidator.predicate(
      "maxVariantPrice >= minVariantPrice",
      product.maxVariantPrice >= product.minVariantPrice,
    );
    // 7. Validate stock filter was applied (hasStock should be true when inStock=true)
    TestValidator.equals("inStock filter applied", product.hasStock, true);
  }
}
