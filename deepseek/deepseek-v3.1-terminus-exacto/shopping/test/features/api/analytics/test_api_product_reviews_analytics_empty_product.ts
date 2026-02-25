import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_reviews_analytics_empty_product(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // Create a product for testing
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Test analytics endpoint with product that has no reviews
  const analytics =
    await api.functional.ecommerce.analytics.products.reviews.analytics(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(analytics);
  // Verify analytics for empty reviews
  TestValidator.equals(
    "total reviews should be zero",
    analytics.total_reviews,
    0,
  );
  // Verify rating distribution is all zeros
  TestValidator.equals(
    "one star count",
    analytics.rating_distribution.one_star,
    0,
  );
  TestValidator.equals(
    "two stars count",
    analytics.rating_distribution.two_stars,
    0,
  );
  TestValidator.equals(
    "three stars count",
    analytics.rating_distribution.three_stars,
    0,
  );
  TestValidator.equals(
    "four stars count",
    analytics.rating_distribution.four_stars,
    0,
  );
  TestValidator.equals(
    "five stars count",
    analytics.rating_distribution.five_stars,
    0,
  );
  // Verify recent trends are empty
  TestValidator.equals(
    "recent reviews count",
    analytics.recent_trends.last_30_days,
    0,
  );
  TestValidator.equals(
    "recent helpful votes",
    analytics.recent_trends.helpful_votes_last_30_days,
    0,
  );
  // Verify optional fields are null
  TestValidator.equals(
    "helpful votes ratio should be null",
    analytics.helpful_votes_ratio,
    null,
  );
  // Average rating should either be null or a valid number (handling both cases)
  TestValidator.predicate(
    "average rating valid",
    analytics.average_rating === null ||
      (analytics.average_rating >= 1 && analytics.average_rating <= 5),
  );
  TestValidator.predicate(
    "recent average rating valid",
    analytics.recent_trends.average_rating_last_30_days === null ||
      (analytics.recent_trends.average_rating_last_30_days >= 1 &&
        analytics.recent_trends.average_rating_last_30_days <= 5),
  );
}
