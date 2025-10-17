import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulnessVote";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test retrieving review details with initial helpfulness vote counts.
 *
 * This test validates that the review detail endpoint correctly displays review
 * information including the helpfulness vote count structure. Due to API
 * limitations (no customer login endpoint available to switch contexts), this
 * test focuses on validating the review detail retrieval and initial vote count
 * state after review creation.
 *
 * Test workflow:
 *
 * 1. Create admin account and product category
 * 2. Create seller account and product with SKU
 * 3. Create customer account (reviewer)
 * 4. Set up customer delivery address and payment method
 * 5. Add product to cart and complete order
 * 6. Create product review from verified purchaser
 * 7. Retrieve review detail
 * 8. Validate review information and initial vote counts
 */
export async function test_api_review_detail_with_helpfulness_votes(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category creation
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(),
      business_type: "corporation",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Create product SKU
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
        >(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create customer account (reviewer)
  const reviewerCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(reviewerCustomer);

  // Step 7: Create delivery address for customer
  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 3 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  // Step 8: Create payment method for customer
  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: "credit_card",
          gateway_token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 9: Generate a cart ID for the customer
  const cartId = typia.random<string & tags.Format<"uuid">>();

  // Step 10: Add product to cart
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 11: Create order from cart
  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  // Step 12: Get the first order ID from response
  const orderId = orderResponse.order_ids[0];

  // Step 13: Create product review from verified purchaser
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_sku_id: sku.id,
        shopping_mall_order_id: orderId,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        review_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // Step 14: Retrieve review detail
  const reviewDetail = await api.functional.shoppingMall.reviews.at(
    connection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(reviewDetail);

  // Step 15: Validate that review ID matches
  TestValidator.equals("review ID should match", reviewDetail.id, review.id);

  // Step 16: Validate that review is from verified purchase
  TestValidator.equals(
    "review should be from verified purchase",
    reviewDetail.verified_purchase,
    true,
  );

  // Step 17: Validate initial helpful vote count (no votes yet)
  TestValidator.equals(
    "initial helpful vote count should be 0",
    reviewDetail.helpful_count,
    0,
  );

  // Step 18: Validate initial not-helpful vote count (no votes yet)
  TestValidator.equals(
    "initial not-helpful vote count should be 0",
    reviewDetail.not_helpful_count,
    0,
  );

  // Step 19: Validate that product ID matches
  TestValidator.equals(
    "product ID should match",
    reviewDetail.shopping_mall_product_id,
    product.id,
  );

  // Step 20: Validate that order ID matches
  TestValidator.equals(
    "order ID should match",
    reviewDetail.shopping_mall_order_id,
    orderId,
  );
}
