import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller reviews pagination for my products.
 *
 * This test validates that an authenticated seller can retrieve paginated
 * reviews for their products with proper filtering and sorting.
 */
export async function test_api_seller_reviews_my_products_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Call PATCH /shoppingMall/seller/reviews/my-products with default pagination
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.reviews.my_products.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  // 3. Validate response structure
  typia.assert(response);
  // 4. Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    response.pagination.pages >= 0,
  );
  // 5. Verify data array structure
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 6. Validate each review in the response
  for (const review of response.data) {
    typia.assert(review);
    // Verify customer summary exists and is valid
    typia.assert(review.customer);
    // Verify orderItem summary exists and is valid
    typia.assert(review.orderItem);
    // Business logic: Verify rating is within valid range (already validated by typia.assert, but checking business constraint)
    TestValidator.predicate(
      "rating is between 1 and 5",
      review.rating >= 1 && review.rating <= 5,
    );
    // Business logic: Verify active reviews have deleted_at as null
    TestValidator.equals(
      "deleted_at is null for active reviews",
      review.deleted_at,
      null,
    );
  }
  // 7. Verify reviews are sorted by created_at descending (newest first)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `review ${i} is not newer than review ${i - 1}`,
        new Date(response.data[i].created_at).getTime() <=
          new Date(response.data[i - 1].created_at).getTime(),
      );
    }
  }
}
