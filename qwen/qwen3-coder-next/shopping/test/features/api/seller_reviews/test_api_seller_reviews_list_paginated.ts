import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test seller review pagination endpoint
 * Validates that sellers can retrieve paginated reviews for their products
 */
export async function test_api_seller_reviews_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerToken: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(3),
        shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(sellerToken);
  // sellerConnection.headers is now updated internally by authorize_seller_join
  // 2. Create product for seller to have reviews
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: [
          {
            sku: RandomGenerator.alphaNumeric(8),
            price: 50000,
            stock: 100,
            options: [
              { name: "size", value: "M" },
              { name: "color", value: "red" },
            ],
          },
        ],
        images: [
          {
            url: "https://example.com/image1.jpg",
            sort: 0,
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 3. Retrieve paginated reviews with default pagination
  const reviewsPage =
    await api.functional.shoppingMall.seller.seller.reviews.manageReviews(
      sellerConnection,
      {
        body: {
          action: "list",
          pagination: {
            current: 1,
            limit: 10,
          },
        },
      },
    );
  typia.assert(reviewsPage);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    reviewsPage.pagination !== undefined,
    true,
  );
  TestValidator.equals("current page is 1", reviewsPage.pagination.current, 1);
  TestValidator.equals("limit is 10", reviewsPage.pagination.limit, 10);
  TestValidator.predicate("records >= 0", reviewsPage.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", reviewsPage.pagination.pages >= 0);
  // 5. Validate review data structure - ISummary has no defined properties
  // Only verify the array exists and has correct length matching pagination
  if (reviewsPage.data.length > 0) {
    TestValidator.equals(
      "data array matches pagination count",
      reviewsPage.data.length <= reviewsPage.pagination.limit,
      true,
    );
  }
  // 6. Test different pagination parameters
  const reviewsPage2 =
    await api.functional.shoppingMall.seller.seller.reviews.manageReviews(
      sellerConnection,
      {
        body: {
          action: "list",
          pagination: {
            current: 2,
            limit: 5,
          },
        },
      },
    );
  typia.assert(reviewsPage2);
  // 7. Test empty reviews scenario (seller with no reviews)
  const newSellerConnection: api.IConnection = { host: connection.host };
  const newSellerToken: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(newSellerConnection, {
      body: {
        name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(3),
        shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(newSellerToken);
  const emptyReviews =
    await api.functional.shoppingMall.seller.seller.reviews.manageReviews(
      newSellerConnection,
      {
        body: {
          action: "list",
          pagination: {
            current: 1,
            limit: 10,
          },
        },
      },
    );
  typia.assert(emptyReviews);
  TestValidator.equals(
    "empty seller has 0 reviews",
    emptyReviews.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty seller has empty data array",
    emptyReviews.data.length,
    0,
  );
}
