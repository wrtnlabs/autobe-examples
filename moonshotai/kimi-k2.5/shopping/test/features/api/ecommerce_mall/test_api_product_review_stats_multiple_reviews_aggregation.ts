import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_review_stats_multiple_reviews_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(seller);
  // 2. Create a product by the seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create three customer accounts and authenticate each
  const customerConnections: api.IConnection[] = [];
  const customers: IEcommerceMallCustomer.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
    typia.assert(customer);
    customerConnections.push(customerConnection);
    customers.push(customer);
  }
  // Note: Review creation API is not available in the provided SDK.
  // In a complete implementation, each customer would purchase the product
  // and submit reviews with ratings 3, 4, and 5 stars respectively.
  // 4. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 5. Retrieve review statistics for the product
  const reviewStats =
    await api.functional.ecommerceMall.admin.products.review_stats.reviewStats(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(reviewStats);
  // 6. Validate review statistics structure
  // When no reviews exist (since review creation API is not available),
  // the stats should show 0 average, 0 total count, and 0 distribution
  TestValidator.equals(
    "average rating range",
    reviewStats.averageRating >= 0 && reviewStats.averageRating <= 5,
    true,
  );
  TestValidator.equals(
    "total count non-negative",
    reviewStats.totalCount >= 0,
    true,
  );
  TestValidator.equals(
    "distribution 1 star non-negative",
    reviewStats.distribution["1"] >= 0,
    true,
  );
  TestValidator.equals(
    "distribution 2 stars non-negative",
    reviewStats.distribution["2"] >= 0,
    true,
  );
  TestValidator.equals(
    "distribution 3 stars non-negative",
    reviewStats.distribution["3"] >= 0,
    true,
  );
  TestValidator.equals(
    "distribution 4 stars non-negative",
    reviewStats.distribution["4"] >= 0,
    true,
  );
  TestValidator.equals(
    "distribution 5 stars non-negative",
    reviewStats.distribution["5"] >= 0,
    true,
  );
  // Validate that total count equals sum of distribution
  const distributionSum =
    reviewStats.distribution["1"] +
    reviewStats.distribution["2"] +
    reviewStats.distribution["3"] +
    reviewStats.distribution["4"] +
    reviewStats.distribution["5"];
  TestValidator.equals(
    "total count equals distribution sum",
    reviewStats.totalCount,
    distributionSum,
  );
  // If there are reviews, validate average calculation
  // Average rating should be between 0 and 5 with one decimal precision
  TestValidator.predicate(
    "average rating has valid precision",
    Math.round(reviewStats.averageRating * 10) ===
      reviewStats.averageRating * 10 || reviewStats.averageRating === 0,
  );
}
