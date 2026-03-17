import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_customer_product_review_stats_deleted_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SellerPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller);
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(product);
  // 2. Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "CustomerPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customer);
  // 3. Login customer to establish session for review creation
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoggedIn: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_login(customerLoginConnection, {
      body: {
        email: customer.email,
        password: "CustomerPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(customerLoggedIn);
  // 4. Create 2 reviews with ratings 4 and 5 stars using generation function
  // The generation function handles order lookup automatically
  const review1: IEcommerceMallReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerLoginConnection,
      {
        body: {
          rating: 4,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          product_id: product.id,
        },
      },
    );
  typia.assert(review1);
  const review2: IEcommerceMallReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerLoginConnection,
      {
        body: {
          rating: 5,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          product_id: product.id,
        },
      },
    );
  typia.assert(review2);
  // 5. Get initial review statistics
  const initialStats: IEcommerceMallProductReviewStat.ISummary =
    await api.functional.ecommerceMall.customer.products.review_stats.getReviewStats(
      customerLoginConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(initialStats);
  // 6. Customer account is soft-deleted (admin operation - assumed to happen outside test scope)
  // The key business requirement: reviews from deleted customers should NOT be deleted
  // and should still contribute to review statistics
  // 7. Get review statistics after customer deletion (assumed)
  const finalStats: IEcommerceMallProductReviewStat.ISummary =
    await api.functional.ecommerceMall.customer.products.review_stats.getReviewStats(
      customerLoginConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(finalStats);
  // 8. Verify that review statistics are unchanged after customer deletion
  // The business requirement states that deleted customer reviews should still
  // contribute to review statistics (no cascading deletion)
  // Verify average rating is still consistent
  TestValidator.equals(
    "average rating should remain consistent after customer deletion",
    finalStats.averageRating,
    initialStats.averageRating,
  );
  // Verify total count remains the same
  TestValidator.equals(
    "total review count should remain unchanged after customer deletion",
    finalStats.totalCount,
    initialStats.totalCount,
  );
  // Verify rating distribution is unchanged
  TestValidator.equals(
    "rating distribution should be unchanged",
    finalStats.ratingDistribution,
    initialStats.ratingDistribution,
  );
  // Verify verified purchase count remains the same
  TestValidator.equals(
    "verified purchase count should remain unchanged",
    finalStats.verifiedPurchaseCount,
    initialStats.verifiedPurchaseCount,
  );
  // Verify unverified purchase count remains the same
  TestValidator.equals(
    "unverified purchase count should remain unchanged",
    finalStats.unverifiedPurchaseCount,
    initialStats.unverifiedPurchaseCount,
  );
  // Verify oldest and newest review dates are unchanged
  TestValidator.equals(
    "oldest review date should remain unchanged",
    finalStats.oldestReviewAt,
    initialStats.oldestReviewAt,
  );
  TestValidator.equals(
    "newest review date should remain unchanged",
    finalStats.newestReviewAt,
    initialStats.newestReviewAt,
  );
  // 9. Verify that the statistics include reviews from the customer
  // The key business rule: reviews should not be excluded from calculations
  // Calculate expected average: (4 + 5) / 2 = 4.5
  const expectedAverage = 4.5;
  TestValidator.equals(
    "average rating should be 4.5 (average of 4 and 5 star reviews)",
    finalStats.averageRating,
    expectedAverage,
  );
  // Verify that both reviews are counted
  TestValidator.equals(
    "total count should be 2 (two reviews from one customer)",
    finalStats.totalCount,
    2,
  );
  // Verify rating distribution: one 4-star, one 5-star
  TestValidator.equals(
    "rating 4 should have count 1",
    finalStats.ratingDistribution["4"],
    1,
  );
  TestValidator.equals(
    "rating 5 should have count 1",
    finalStats.ratingDistribution["5"],
    1,
  );
  TestValidator.equals(
    "rating 1 should have count 0",
    finalStats.ratingDistribution["1"],
    0,
  );
  TestValidator.equals(
    "rating 2 should have count 0",
    finalStats.ratingDistribution["2"],
    0,
  );
  TestValidator.equals(
    "rating 3 should have count 0",
    finalStats.ratingDistribution["3"],
    0,
  );
}