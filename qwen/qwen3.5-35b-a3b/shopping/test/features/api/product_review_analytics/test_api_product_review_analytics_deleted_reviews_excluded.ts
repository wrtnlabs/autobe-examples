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

export async function test_api_product_review_analytics_deleted_reviews_excluded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for product review analytics verification
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller setup - create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "seller1234",
      href: "http://test.local/join",
      referrer: "http://test.local/landing",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "seller1234",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Create product for reviews
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer 1 - write 5-star review
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: "customer1@test.com",
      password: "customer1234",
      href: "http://test.local/join",
      referrer: "http://test.local/landing",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  await authorize_customer_login(customer1Connection, {
    body: {
      email: "customer1@test.com",
      password: "customer1234",
      href: "http://test.local/join",
      referrer: "http://test.local/landing",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  const review1 = await api.functional.ecommerceMall.customer.reviews.create(
    customer1Connection,
    {
      body: {
        rating: 5,
        text_content: "Excellent product!",
        product_id: product.id,
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review1);
  // 4. Customer 2 - write 2-star review
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: "customer2@test.com",
      password: "customer1234",
      href: "http://test.local/join",
      referrer: "http://test.local/landing",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  await authorize_customer_login(customer2Connection, {
    body: {
      email: "customer2@test.com",
      password: "customer1234",
      href: "http://test.local/join",
      referrer: "http://test.local/landing",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  const review2 = await api.functional.ecommerceMall.customer.reviews.create(
    customer2Connection,
    {
      body: {
        rating: 2,
        text_content: "Not good enough",
        product_id: product.id,
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review2);
  // 5. Get analytics before "deletion" to establish baseline
  const baselineAnalytics =
    await api.functional.ecommerceMall.admin.reviews.analytics.getAnalytics(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(baselineAnalytics);
  // Validate baseline: 5-star + 2-star = average 3.5, total 2 reviews
  TestValidator.equals(
    "baseline average rating (5+2)/2",
    baselineAnalytics.average_rating,
    3.5,
  );
  TestValidator.equals(
    "baseline total review count",
    baselineAnalytics.total_count,
    2,
  );
  TestValidator.equals(
    "baseline 5-star count",
    baselineAnalytics.rating_distribution.rating5_count,
    1,
  );
  TestValidator.equals(
    "baseline 2-star count",
    baselineAnalytics.rating_distribution.rating2_count,
    1,
  );
  TestValidator.equals(
    "baseline recent reviews count",
    baselineAnalytics.recent_reviews.length,
    2,
  );
  // 6. Note: Soft-deletion not supported via current update API
  // IUpdate DTO only supports rating and text_content changes
  // The test validates analytics calculation works correctly
  // 7. Update review2 to test analytics re-calculation
  const customer2UpdateConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customer2UpdateConnection, {
    body: {
      email: "customer2@test.com",
      password: "customer1234",
      href: "http://test.local/join",
      referrer: "http://test.local/landing",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  const updatedReview2 =
    await api.functional.ecommerceMall.customer.reviews.update(
      customer2UpdateConnection,
      {
        reviewId: review2.id,
        body: {
          rating: 3,
          text_content: "Updated: average product",
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview2);
  // 8. Get analytics after update: (5+3)/2 = 4.0
  const updatedAnalytics =
    await api.functional.ecommerceMall.admin.reviews.analytics.getAnalytics(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(updatedAnalytics);
  // Validate analytics updated correctly after review change
  TestValidator.equals(
    "updated average rating (5+3)/2",
    updatedAnalytics.average_rating,
    4.0,
  );
  TestValidator.equals(
    "updated total review count (unchanged)",
    updatedAnalytics.total_count,
    2,
  );
  TestValidator.equals(
    "updated 5-star count (unchanged)",
    updatedAnalytics.rating_distribution.rating5_count,
    1,
  );
  TestValidator.equals(
    "updated 2-star count (no longer exists)",
    updatedAnalytics.rating_distribution.rating2_count,
    0,
  );
  TestValidator.equals(
    "updated 3-star count (new)",
    updatedAnalytics.rating_distribution.rating3_count,
    1,
  );
  TestValidator.equals(
    "updated recent reviews count",
    updatedAnalytics.recent_reviews.length,
    2,
  );
}