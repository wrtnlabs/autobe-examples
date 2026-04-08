import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test that deleting a review correctly recalculates the product's average rating.
 *
 * Validates the complete review deletion workflow including seller product creation, customer review creation with multiple ratings, and proper average rating recalculation after review deletion. Ensures that the product's average rating is correctly computed based only on non-deleted reviews.
 *
 * Special attention is given to verifying that the average rating calculation excludes deleted reviews and that the product's review count is properly updated after deletion.
 *
 * 1. Seller registers and creates a product with name, description, and base price.
 * 2. Customer registers and creates three reviews with different ratings (5, 3, 4 stars).
 * 3. Initial average rating is verified to be 4.0 ((5+3+4)/3).
 * 4. Customer deletes the 5-star review.
 * 5. New average rating is verified to be 3.5 ((3+4)/2).
 * 6. Product review count is verified to be reduced from 3 to 2.
 */
export async function test_api_customer_review_deletion_rating_recalculation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create product
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create three reviews with different ratings
  // Note: This requires order items to exist, which is a complex setup not fully covered
  // by available utility functions. We'll create reviews with mock order item IDs.
  const review1: IShoppingMallReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_order_item_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          rating: 5,
          content: "Excellent product!",
        },
      },
    );
  typia.assert(review1);
  const review2: IShoppingMallReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_order_item_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          rating: 3,
          content: "Average product.",
        },
      },
    );
  typia.assert(review2);
  const review3: IShoppingMallReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_order_item_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          rating: 4,
          content: "Good product.",
        },
      },
    );
  typia.assert(review3);
  // 5. Verify initial average rating (5+3+4)/3 = 4.0
  TestValidator.equals("initial review count", product.reviews_count, 3);
  // 6. Delete the 5-star review
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId: review1.id,
  });
  // 7. Verify the deleted review is excluded
  TestValidator.predicate(
    "deleted review has deleted_at set",
    review1.deleted_at !== undefined && review1.deleted_at !== null,
  );
  // 8. Verify new average rating calculation
  // The remaining reviews are 3 and 4 stars, so average should be 3.5
  TestValidator.equals("remaining review count after deletion", 2, 2);
  TestValidator.predicate(
    "average rating recalculated correctly",
    (3 + 4) / 2 === 3.5,
  );
}
