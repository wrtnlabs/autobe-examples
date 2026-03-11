import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IReviewAnalyticsResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewAnalyticsResponse";
import type { IReviewAnalyticsReviewPreview } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewAnalyticsReviewPreview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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

export async function test_api_product_review_analytics_with_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminResult);
  // Login as admin with the same connection
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminResult.email,
      password: adminPassword,
    },
  });
  // 2. Seller setup - join and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerResult);
  // 3. Create a product as seller
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create first customer and write 5-star review
  const customer1Password = RandomGenerator.alphaNumeric(16);
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Result = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: customer1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer1Result);
  const review1 = await api.functional.ecommerceMall.customer.reviews.create(
    customer1Connection,
    {
      body: {
        rating: 5,
        text_content: "Excellent product! Highly recommended.",
        product_id: product.id,
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review1);
  // 5. Create second customer and write 4-star review
  const customer2Password = RandomGenerator.alphaNumeric(16);
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Result = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: customer2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer2Result);
  const review2 = await api.functional.ecommerceMall.customer.reviews.create(
    customer2Connection,
    {
      body: {
        rating: 4,
        text_content: "Good product with minor issues.",
        product_id: product.id,
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review2);
  // 6. Create third customer and write 3-star review
  const customer3Password = RandomGenerator.alphaNumeric(16);
  const customer3Connection: api.IConnection = { host: connection.host };
  const customer3Result = await authorize_customer_join(customer3Connection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: customer3Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer3Result);
  const review3 = await api.functional.ecommerceMall.customer.reviews.create(
    customer3Connection,
    {
      body: {
        rating: 3,
        text_content: "Average product, could be better.",
        product_id: product.id,
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review3);
  // 7. Get review analytics as admin
  const analytics =
    await api.functional.ecommerceMall.admin.reviews.analytics.getAnalytics(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(analytics);
  // 8. Validate analytics
  // Average rating: (5 + 4 + 3) / 3 = 4.0
  TestValidator.equals(
    "average rating should be 4.0",
    analytics.average_rating,
    4.0,
  );
  // Total count should be 3
  TestValidator.equals("total review count", analytics.total_count, 3);
  // Rating distribution
  TestValidator.equals(
    "5-star count",
    analytics.rating_distribution.rating5_count,
    1,
  );
  TestValidator.equals(
    "4-star count",
    analytics.rating_distribution.rating4_count,
    1,
  );
  TestValidator.equals(
    "3-star count",
    analytics.rating_distribution.rating3_count,
    1,
  );
  TestValidator.equals(
    "2-star count",
    analytics.rating_distribution.rating2_count,
    0,
  );
  TestValidator.equals(
    "1-star count",
    analytics.rating_distribution.rating1_count,
    0,
  );
  // Recent reviews should have 3 items
  TestValidator.equals(
    "recent reviews count",
    analytics.recent_reviews.length,
    3,
  );
  // Recent reviews should be sorted by created_at DESC (newest first)
  if (analytics.recent_reviews.length >= 2) {
    TestValidator.predicate(
      "reviews sorted by created_at DESC",
      analytics.recent_reviews[0].createdAt >=
        analytics.recent_reviews[1].createdAt,
    );
  }
  // Each review preview should have required fields
  for (const reviewPreview of analytics.recent_reviews) {
    typia.assert(reviewPreview);
    TestValidator.predicate(
      "review has valid rating",
      reviewPreview.rating >= 1 && reviewPreview.rating <= 5,
    );
    TestValidator.predicate(
      "review has created_at",
      reviewPreview.createdAt !== undefined,
    );
  }
}
