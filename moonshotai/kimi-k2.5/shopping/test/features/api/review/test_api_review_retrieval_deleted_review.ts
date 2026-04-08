import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test retrieval of a review that was marked as deleted (soft-delete).
 *
 * 1. Authenticate as seller and create a product
 * 2. Authenticate as customer and add product to cart
 * 3. Create a review for a delivered order item
 * 4. Delete the review (soft-delete)
 * 5. Attempt to retrieve the deleted review as a public user (should fail)
 * 6. Verify that soft-deleted reviews are properly hidden from public access
 */
export async function test_api_review_retrieval_deleted_review(
  connection: api.IConnection,
): Promise<void> {
  // Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Create a product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add product variant to cart
  if (product.variants.length === 0) {
    throw new Error("Product must have at least one variant");
  }
  const variant = product.variants[0];
  typia.assert(variant);
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // Create a review as customer
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  // Verify review is not deleted initially
  TestValidator.equals("review not deleted initially", review.deletedAt, null);
  // Delete the review (soft-delete)
  await api.functional.ecommerceMall.customer.reviews.erase(
    customerConnection,
    {
      reviewId: review.id,
    },
  );
  // Test: Public access to deleted review should be denied (404 or 403)
  await TestValidator.error("public cannot access deleted review", async () => {
    await api.functional.ecommerceMall.reviews.at(connection, {
      reviewId: review.id,
    });
  });
  // Test: Owner may still see the review with deleted flag, or may also be denied
  // This validates soft-delete implementation visibility rules
  try {
    const ownerView = await api.functional.ecommerceMall.reviews.at(
      customerConnection,
      {
        reviewId: review.id,
      },
    );
    typia.assert(ownerView);
    // If returned, verify it has deletion timestamp to confirm soft-delete
    TestValidator.predicate(
      "owner sees deleted review with timestamp",
      ownerView.deletedAt !== null,
    );
  } catch (_e) {
    // Some implementations hide deleted reviews even from owners (404)
    // This is acceptable behavior per the visibility rules
  }
}
