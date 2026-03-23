import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
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
import { generate_random_ecommerce_mall_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_products_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_seller_review_analytics_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Customer setup for reviews
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Seller creates product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create reviews with known timestamps
  const review1 =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customerConnection,
      {
        productId: product.id,
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          rating: 4,
          text_content: "Review 1",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review1);
  const review2 =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customerConnection,
      {
        productId: product.id,
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          rating: 3,
          text_content: "Review 2",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review2);
  const review3 =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customerConnection,
      {
        productId: product.id,
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          rating: 5,
          text_content: "Review 3",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review3);
  // 5. Test analytics without time filter (should return all 3 reviews)
  const allReviewsAnalytics =
    await api.functional.ecommerceMall.seller.analytics.reviews.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          rating: 5,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(allReviewsAnalytics);
  TestValidator.equals(
    "should have 3 reviews",
    allReviewsAnalytics.data.length,
    3,
  );
  // 6. Test analytics with pagination
  const paginatedAnalytics =
    await api.functional.ecommerceMall.seller.analytics.reviews.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 2,
          rating: 5,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(paginatedAnalytics);
  TestValidator.equals(
    "pagination limit respected",
    paginatedAnalytics.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records count",
    paginatedAnalytics.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages count",
    paginatedAnalytics.pagination.pages,
    2,
  );
  // 7. Test reviews are properly sorted (newest first)
  if (paginatedAnalytics.data.length >= 2) {
    const firstDate = new Date(paginatedAnalytics.data[0].created_at).getTime();
    const secondDate = new Date(
      paginatedAnalytics.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "reviews sorted by newest first",
      firstDate >= secondDate,
    );
  }
}
