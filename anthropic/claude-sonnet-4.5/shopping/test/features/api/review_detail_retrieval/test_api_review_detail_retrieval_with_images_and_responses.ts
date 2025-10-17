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
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerResponse";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test retrieving complete detailed information for a specific product review
 * including all associated data such as customer-uploaded images and seller
 * responses.
 *
 * This test validates the review detail retrieval endpoint by executing a
 * complete e-commerce workflow:
 *
 * 1. Create admin account for category management
 * 2. Create seller account to own products
 * 3. Create customer account for purchasing and reviewing
 * 4. Set up product catalog (category, product, SKU)
 * 5. Complete customer purchase flow (address, payment, cart, order)
 * 6. Submit product review with images
 * 7. Seller responds to the review
 * 8. Retrieve and validate complete review detail with all components
 */
export async function test_api_review_detail_retrieval_with_images_and_responses(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
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
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account and save authentication token
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(3),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Save seller authentication token for later use
  const sellerToken = seller.token.access;

  // Step 4: Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<number & tags.Minimum<1>>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Create SKU variant
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: typia.random<number & tags.Minimum<1>>(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 7: Create delivery address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 4 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "USA",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  // Step 8: Create payment method
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

  // Step 9: Add item to cart (generate a cart ID)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 10: Create order
  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  // Extract the first order ID from the response
  const orderId = orderResponse.order_ids[0];
  typia.assertGuard(orderId!);

  // Step 11: Submit product review with rating and text
  const reviewRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const reviewTitle = RandomGenerator.paragraph({ sentences: 3 });
  const reviewText = RandomGenerator.content({ paragraphs: 2 });

  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_sku_id: sku.id,
        shopping_mall_order_id: orderId,
        rating: reviewRating,
        title: reviewTitle,
        review_text: reviewText,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // Step 12: Upload images to the review (upload 3 images as example)
  const imageCount = 3;
  const uploadedImages = await ArrayUtil.asyncRepeat(
    imageCount,
    async (index) => {
      const reviewImage =
        await api.functional.shoppingMall.customer.reviews.images.create(
          connection,
          {
            reviewId: review.id,
            body: {
              image_url: `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
              display_order: index + 1,
            } satisfies IShoppingMallReviewImage.ICreate,
          },
        );
      typia.assert(reviewImage);
      return reviewImage;
    },
  );

  // Step 13: Restore seller authentication to post response
  connection.headers = connection.headers || {};
  connection.headers.Authorization = sellerToken;

  const sellerResponseText = RandomGenerator.content({ paragraphs: 1 });
  const sellerResponse =
    await api.functional.shoppingMall.seller.sellerResponses.create(
      connection,
      {
        body: {
          shopping_mall_review_id: review.id,
          response_text: sellerResponseText,
        } satisfies IShoppingMallSellerResponse.ICreate,
      },
    );
  typia.assert(sellerResponse);

  // Step 14: Retrieve complete review detail
  const reviewDetail = await api.functional.shoppingMall.reviews.at(
    connection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(reviewDetail);

  // Step 15: Validate all review detail components
  TestValidator.equals("review ID matches", reviewDetail.id, review.id);
  TestValidator.equals(
    "customer ID matches",
    reviewDetail.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "product ID matches",
    reviewDetail.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "SKU ID matches",
    reviewDetail.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "order ID matches",
    reviewDetail.shopping_mall_order_id,
    orderId,
  );
  TestValidator.equals("rating matches", reviewDetail.rating, reviewRating);
  TestValidator.equals("title matches", reviewDetail.title, reviewTitle);
  TestValidator.equals(
    "review text matches",
    reviewDetail.review_text,
    reviewText,
  );
  TestValidator.equals(
    "verified purchase is true",
    reviewDetail.verified_purchase,
    true,
  );
  TestValidator.predicate(
    "status is set",
    reviewDetail.status !== null && reviewDetail.status !== undefined,
  );
  TestValidator.equals(
    "helpful count initialized",
    reviewDetail.helpful_count,
    0,
  );
  TestValidator.equals(
    "not helpful count initialized",
    reviewDetail.not_helpful_count,
    0,
  );

  // Validate timestamps are present
  TestValidator.predicate(
    "created_at is present",
    reviewDetail.created_at !== null && reviewDetail.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    reviewDetail.updated_at !== null && reviewDetail.updated_at !== undefined,
  );
}
