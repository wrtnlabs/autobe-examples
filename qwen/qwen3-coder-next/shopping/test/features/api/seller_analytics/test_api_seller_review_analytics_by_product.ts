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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_review_analytics_by_product(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // Create a product for this seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Create multiple reviews with varied ratings for the product
  const ratings = [1, 2, 3, 4, 5] as const;
  for (const rating of ratings) {
    await api.functional.ecommerceMall.seller.analytics.reviews.index(
      sellerConnection,
      {
        body: {
          rating: rating,
          text_content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  }
  // Get analytics for seller's products - include required rating field for DTO compliance
  const analytics =
    await api.functional.ecommerceMall.seller.analytics.reviews.index(
      sellerConnection,
      {
        body: {
          rating: 3 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5> satisfies number as number,
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(analytics);
  // Verify analytics structure
  TestValidator.equals("has reviews", analytics.data.length > 0, true);
  TestValidator.predicate(
    "has at least one review",
    analytics.data.length >= 1,
  );
  // Verify that reviews exist for this seller's products
  const productReviews = analytics.data.filter(
    (r: IEcommerceMallReview.ISummary) => r.product.id === product.id,
  );
  TestValidator.predicate(
    "has reviews for created product",
    productReviews.length > 0,
  );
  // Verify rating average calculation if reviews exist
  if (productReviews.length > 0) {
    const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / productReviews.length;
    TestValidator.predicate(
      "average rating is valid",
      averageRating >= 1 && averageRating <= 5,
    );
  }
}
