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

export async function test_api_review_submission_verified_purchase(
  connection: api.IConnection,
) {
  // Step 1: Admin Setup - Create Category
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

  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 2: Seller Setup - Registration, Verification, Product Creation
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Verify seller email
  const verificationToken = RandomGenerator.alphaNumeric(32);
  const verifyEmailData = {
    token: verificationToken,
  } satisfies IShoppingMallSeller.IVerifyEmail;

  const verificationResponse: IShoppingMallSeller.IVerifyEmailResponse =
    await api.functional.auth.seller.verification.confirm.verifyEmail(
      connection,
      {
        body: verifyEmailData,
      },
    );
  typia.assert(verificationResponse);

  // Create product
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Create SKU variant
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData,
    });
  typia.assert(sku);

  // Step 3: Customer Setup and Purchase Flow
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

  // Create delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Create payment method
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

  // Add product to cart
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItemData = {
    shopping_mall_sku_id: sku.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: cartItemData,
    });
  typia.assert(cartItem);

  // Place order
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
    "order creation should return at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];

  // Step 4: Submit Product Review
  const reviewData = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    shopping_mall_order_id: orderId,
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    review_text: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IShoppingMallReview.ICreate;

  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: reviewData,
    });
  typia.assert(review);

  // Step 5: Validate Review Details
  TestValidator.equals(
    "review customer ID matches authenticated customer",
    review.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "review product ID matches submitted product",
    review.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review SKU ID matches submitted SKU",
    review.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "review order ID matches created order",
    review.shopping_mall_order_id,
    orderId,
  );
  TestValidator.equals(
    "review rating matches submitted rating",
    review.rating,
    reviewData.rating,
  );
  TestValidator.equals(
    "review has verified purchase flag",
    review.verified_purchase,
    true,
  );
  TestValidator.equals(
    "review status is pending moderation",
    review.status,
    "pending_moderation",
  );
  TestValidator.predicate("review ID is assigned", review.id.length > 0);
  TestValidator.predicate(
    "review rating is within valid range",
    review.rating >= 1 && review.rating <= 5,
  );
  TestValidator.predicate(
    "review helpful count is initialized",
    review.helpful_count === 0,
  );
  TestValidator.predicate(
    "review not-helpful count is initialized",
    review.not_helpful_count === 0,
  );
}
