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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test the review editing workflow within the 30-day edit window.
 *
 * This test validates the complete review update process for a verified
 * purchase. It establishes the full e-commerce workflow from account creation
 * through product listing, purchase, review submission, and finally review
 * modification.
 *
 * Test workflow:
 *
 * 1. Create admin account for category management
 * 2. Create product category
 * 3. Create and verify seller account
 * 4. Create product and SKU variant
 * 5. Create customer account with delivery and payment setup
 * 6. Complete purchase to establish verified purchase status
 * 7. Submit initial product review
 * 8. Update the review with modified rating, title, and text
 * 9. Validate the updated review reflects all changes and maintains integrity
 */
export async function test_api_review_update_within_edit_window(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 3: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 2 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 4: Verify seller email (simulated verification)
  const verificationData = {
    token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallSeller.IVerifyEmail;

  const verificationResult: IShoppingMallSeller.IVerifyEmailResponse =
    await api.functional.auth.seller.verification.confirm.verifyEmail(
      connection,
      {
        body: verificationData,
      },
    );
  typia.assert(verificationResult);

  // Step 5: Create product
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<50000>
    >() satisfies number as number,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 6: Create SKU variant
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<50000>
    >() satisfies number as number,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData,
    });
  typia.assert(sku);

  // Step 7: Create customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(customer);

  // Step 8: Create delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(address);

  // Step 9: Create payment method
  const paymentMethodData = {
    payment_type: "credit_card",
    gateway_token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: paymentMethodData,
      },
    );
  typia.assert(paymentMethod);

  // Step 10: Add product to cart (generate cart ID as shopping cart identifier)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItemData = {
    shopping_mall_sku_id: sku.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >() satisfies number as number,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: cartItemData,
    });
  typia.assert(cartItem);
  TestValidator.predicate(
    "cart item quantity is positive",
    cartItem.quantity > 0,
  );

  // Step 11: Create order
  const orderData = {
    delivery_address_id: address.id,
    payment_method_id: paymentMethod.id,
    shipping_method: "standard",
  } satisfies IShoppingMallOrder.ICreate;

  const orderResponse: IShoppingMallOrder.ICreateResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderData,
    });
  typia.assert(orderResponse);
  TestValidator.predicate(
    "order created successfully",
    orderResponse.order_ids.length > 0,
  );

  // Extract first order ID
  const orderId = typia.assert(orderResponse.order_ids[0]!);

  // Step 12: Create initial review
  const initialRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >() satisfies number as number;
  const initialTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const initialReviewText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
  });

  const initialReviewData = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    shopping_mall_order_id: orderId,
    rating: initialRating,
    title: initialTitle,
    review_text: initialReviewText,
  } satisfies IShoppingMallReview.ICreate;

  const initialReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: initialReviewData,
    });
  typia.assert(initialReview);

  // Validate initial review
  TestValidator.equals(
    "initial review product matches",
    initialReview.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "initial review order matches",
    initialReview.shopping_mall_order_id,
    orderId,
  );
  TestValidator.equals(
    "initial review is verified purchase",
    initialReview.verified_purchase,
    true,
  );
  TestValidator.predicate(
    "initial review rating is valid",
    initialReview.rating >= 1 && initialReview.rating <= 5,
  );

  // Step 13: Update the review with modified content
  const updatedRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >() satisfies number as number;
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  });
  const updatedReviewText = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const updateData = {
    rating: updatedRating,
    title: updatedTitle,
    review_text: updatedReviewText,
  } satisfies IShoppingMallReview.IUpdate;

  const updatedReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.update(connection, {
      reviewId: initialReview.id,
      body: updateData,
    });
  typia.assert(updatedReview);

  // Step 14: Validate updated review maintains integrity and reflects changes
  TestValidator.equals(
    "review ID preserved after update",
    updatedReview.id,
    initialReview.id,
  );
  TestValidator.equals(
    "review rating successfully updated",
    updatedReview.rating,
    updatedRating,
  );
  TestValidator.equals(
    "review title successfully updated",
    updatedReview.title,
    updatedTitle,
  );
  TestValidator.equals(
    "review text successfully updated",
    updatedReview.review_text,
    updatedReviewText,
  );
  TestValidator.equals(
    "verified purchase flag maintained after update",
    updatedReview.verified_purchase,
    true,
  );
  TestValidator.equals(
    "review product association maintained",
    updatedReview.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review order association maintained",
    updatedReview.shopping_mall_order_id,
    orderId,
  );

  // Validate updated_at timestamp changed
  TestValidator.predicate(
    "updated_at timestamp reflects modification",
    new Date(updatedReview.updated_at).getTime() >
      new Date(initialReview.created_at).getTime(),
  );

  // Validate the review enters moderation workflow
  TestValidator.predicate(
    "updated review status indicates moderation workflow",
    updatedReview.status === "pending_moderation" ||
      updatedReview.status === "approved",
  );
}
