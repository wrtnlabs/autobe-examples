import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_filter_by_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Search for products to get a valid product ID
  const productsResponse =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: null,
          categoryId: null,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: null,
          sortBy: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(productsResponse);
  // Skip if no products available
  if (productsResponse.data.length === 0) {
    return;
  }
  // Get first product ID for filtering
  const targetProductId = productsResponse.data[0]!.id;
  // 3. Filter reviews by the specific product ID
  const reviewsResponse =
    await api.functional.ecommerceMall.customer.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId: targetProductId,
          customerId: null,
          minRating: null,
          maxRating: null,
          createdAfter: null,
          createdBefore: null,
          search: null,
          sort: "newest",
          includeDeleted: null,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(reviewsResponse);
  // 4. Validate reviews are filtered correctly (all reviews should be for the specified product)
  for (const review of reviewsResponse.data) {
    TestValidator.equals(
      "review product ID matches filter",
      review.product.id,
      targetProductId,
    );
  }
  // 5. Test with non-existent product ID to verify empty result handling
  const randomProductId = typia.random<string & tags.Format<"uuid">>();
  const emptyResponse =
    await api.functional.ecommerceMall.customer.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId: randomProductId,
          customerId: null,
          minRating: null,
          maxRating: null,
          createdAfter: null,
          createdBefore: null,
          search: null,
          sort: "newest",
          includeDeleted: null,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // Validate empty results
  TestValidator.equals("empty response data", emptyResponse.data.length, 0);
  TestValidator.equals(
    "empty response records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty response pages",
    emptyResponse.pagination.pages,
    0,
  );
}
