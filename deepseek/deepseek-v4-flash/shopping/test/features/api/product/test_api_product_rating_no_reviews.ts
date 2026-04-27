import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that a product with no reviews returns averageRating=0 and totalCount=0.
 *
 * Validates the rating summary aggregation endpoint when no customer reviews exist for a product. The specification states that when a product has no non-deleted reviews, the average rating returns 0 and the review count returns 0.
 *
 * This test covers the baseline scenario: a freshly created product that has received no reviews from customers. The rating is computed by aggregating the e_commerce_mall_reviews table filtered by product_id and where deleted_at IS NULL.
 *
 * 1. Join as a seller via authorize_seller_join utility.
 * 2. Create a product via generate_random_e_commerce_mall_seller_products_create utility.
 * 3. Retrieve the rating summary via GET /eCommerceMall/seller/products/{productId}/ratings.
 * 4. Validate that averageRating equals 0 and totalCount equals 0.
 */
export async function test_api_product_rating_no_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Product creation (no category, no reviews yet)
  const product: IECommerceMallProduct =
    await generate_random_e_commerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Retrieve rating summary
  const rating: IECommerceMallProduct.IRating =
    await api.functional.eCommerceMall.seller.products.ratings.at(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(rating);
  // 4. Validate no-reviews baseline
  TestValidator.equals("average rating is 0", rating.averageRating, 0);
  TestValidator.equals("total count is 0", rating.totalCount, 0);
}
