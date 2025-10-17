import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Complete workflow test for verified customer uploading images to product
 * review.
 *
 * This test validates the entire e-commerce journey from account creation
 * through product purchase, review submission, and image upload. It ensures
 * that only verified purchasers can upload review images and that all
 * dependencies are properly established throughout the workflow.
 *
 * Workflow steps:
 *
 * 1. Create admin account for category management
 * 2. Create seller account for product listing
 * 3. Create customer account for purchasing
 * 4. Configure customer delivery address
 * 5. Configure customer payment method
 * 6. Admin creates product category
 * 7. Seller creates product listing
 * 8. Customer places order for product
 * 9. Customer submits product review
 * 10. Customer uploads images to review
 * 11. Validate image upload success
 */
export async function test_api_review_image_upload_by_verified_customer(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name()} Street`,
    tax_id: RandomGenerator.alphaNumeric(9),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 3: Create customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerData,
  });
  typia.assert(customer);

  // Step 4: Create customer delivery address
  const addressData = {
    recipient_name: customer.name,
    phone_number: RandomGenerator.mobile(),
    address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name()} Avenue`,
    city: RandomGenerator.name(),
    state_province: RandomGenerator.name(),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: addressData,
    },
  );
  typia.assert(address);

  // Step 5: Create customer payment method
  const paymentMethodData = {
    payment_type: "credit_card",
    gateway_token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: paymentMethodData,
      },
    );
  typia.assert(paymentMethod);

  // Step 6: Admin creates product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 7: Seller creates product
  const productData = {
    name: RandomGenerator.name(3),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
    >() satisfies number as number,
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 8: Customer places order
  const orderData = {
    delivery_address_id: address.id,
    payment_method_id: paymentMethod.id,
    shipping_method: "standard",
  } satisfies IShoppingMallOrder.ICreate;

  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderData,
    });
  typia.assert(orderResponse);

  TestValidator.predicate(
    "order creation should return at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];
  typia.assertGuard(orderId);

  // Step 9: Customer submits product review
  const reviewData = {
    shopping_mall_product_id: product.id,
    shopping_mall_order_id: orderId,
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >() satisfies number as number,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    review_text: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IShoppingMallReview.ICreate;

  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: reviewData,
    },
  );
  typia.assert(review);

  TestValidator.equals(
    "review product ID should match",
    review.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review order ID should match",
    review.shopping_mall_order_id,
    orderId,
  );
  TestValidator.predicate(
    "review should be verified purchase",
    review.verified_purchase === true,
  );

  // Step 10: Customer uploads image to review
  const imageData = {
    image_url: `https://example.com/reviews/${RandomGenerator.alphaNumeric(16)}.jpg`,
    display_order: 1,
  } satisfies IShoppingMallReviewImage.ICreate;

  const reviewImage =
    await api.functional.shoppingMall.customer.reviews.images.create(
      connection,
      {
        reviewId: review.id,
        body: imageData,
      },
    );
  typia.assert(reviewImage);

  // Step 11: Validate image upload
  TestValidator.equals(
    "review image should be linked to correct review",
    reviewImage.shopping_mall_review_id,
    review.id,
  );
  TestValidator.equals(
    "review image URL should match",
    reviewImage.image_url,
    imageData.image_url,
  );
  TestValidator.equals(
    "review image display order should match",
    reviewImage.display_order,
    imageData.display_order,
  );
}
