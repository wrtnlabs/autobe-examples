import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_price_range_with_seller_and_rating(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IECommerceMallCustomer.IJoin,
  });
  // 2. Search with combined minPrice + maxPrice (50 <= price <= 200)
  const resultCombined =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          minPrice: 50,
          maxPrice: 200,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(resultCombined);
  // 3. Search with only minPrice (price >= 100)
  const resultMinOnly =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          minPrice: 100,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(resultMinOnly);
  // 4. Search with only maxPrice (price <= 25)
  const resultMaxOnly =
    await api.functional.eCommerceMall.customer.search.products.search(
      customerConnection,
      {
        body: {
          maxPrice: 25,
        } satisfies IECommerceMallProduct.IRequest,
      },
    );
  typia.assert(resultMaxOnly);
  // 5. Validate response structure for all result sets
  for (const product of resultCombined.data) {
    // seller.shop_name must be present and non-empty
    TestValidator.predicate(
      "seller shop_name is set in combined results",
      () =>
        typeof product.seller.profile.shop_name === "string" &&
        product.seller.profile.shop_name.length > 0,
    );
    // average_rating: null when no reviews, number when reviews exist
    TestValidator.predicate(
      "average_rating is null or number in combined results",
      () =>
        product.average_rating === null ||
        (typeof product.average_rating === "number" &&
          product.average_rating >= 0),
    );
    // review_count is always a non-negative integer
    TestValidator.predicate(
      "review_count is non-negative integer in combined results",
      () => Number.isInteger(product.review_count) && product.review_count >= 0,
    );
    // thumbnail: null when no images, URI string otherwise
    TestValidator.predicate(
      "thumbnail is null or string in combined results",
      () => product.thumbnail === null || typeof product.thumbnail === "string",
    );
    // base_price must be a positive number
    TestValidator.predicate(
      "base_price is positive in combined results",
      () => typeof product.base_price === "number" && product.base_price > 0,
    );
  }
  for (const product of resultMinOnly.data) {
    TestValidator.predicate(
      "seller shop_name is set in min-only results",
      () =>
        typeof product.seller.profile.shop_name === "string" &&
        product.seller.profile.shop_name.length > 0,
    );
    TestValidator.predicate(
      "average_rating is null or number in min-only results",
      () =>
        product.average_rating === null ||
        (typeof product.average_rating === "number" &&
          product.average_rating >= 0),
    );
    TestValidator.predicate(
      "review_count is non-negative integer in min-only results",
      () => Number.isInteger(product.review_count) && product.review_count >= 0,
    );
    TestValidator.predicate(
      "thumbnail is null or string in min-only results",
      () => product.thumbnail === null || typeof product.thumbnail === "string",
    );
    TestValidator.predicate(
      "base_price is positive in min-only results",
      () => typeof product.base_price === "number" && product.base_price > 0,
    );
  }
  for (const product of resultMaxOnly.data) {
    TestValidator.predicate(
      "seller shop_name is set in max-only results",
      () =>
        typeof product.seller.profile.shop_name === "string" &&
        product.seller.profile.shop_name.length > 0,
    );
    TestValidator.predicate(
      "average_rating is null or number in max-only results",
      () =>
        product.average_rating === null ||
        (typeof product.average_rating === "number" &&
          product.average_rating >= 0),
    );
    TestValidator.predicate(
      "review_count is non-negative integer in max-only results",
      () => Number.isInteger(product.review_count) && product.review_count >= 0,
    );
    TestValidator.predicate(
      "thumbnail is null or string in max-only results",
      () => product.thumbnail === null || typeof product.thumbnail === "string",
    );
    TestValidator.predicate(
      "base_price is positive in max-only results",
      () => typeof product.base_price === "number" && product.base_price > 0,
    );
  }
}
