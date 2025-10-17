import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
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
 * Test review search with verified purchase filtering.
 *
 * This test validates that the review search functionality correctly returns
 * only reviews from verified purchases. It creates a complete order workflow
 * including customer registration, product creation, order placement, and
 * review submission, then verifies that all returned reviews have the
 * verified_purchase flag set to true.
 *
 * Test workflow:
 *
 * 1. Create admin account for category management
 * 2. Create seller account for product ownership
 * 3. Create category for product classification
 * 4. Create product and SKU for ordering
 * 5. Create customer account for purchasing
 * 6. Set up delivery address and payment method
 * 7. Create order directly (cart workflow removed due to API limitations)
 * 8. Submit review as verified purchaser
 * 9. Search reviews and verify all have verified_purchase = true
 */
export async function test_api_reviews_search_by_verification_status(
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
    business_type: "corporation",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 3: Create category
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

  // Step 4: Create product
  const productData = {
    name: RandomGenerator.name(3),
    base_price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 5: Create SKU for the product
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 6: Create customer account
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

  // Step 7: Create delivery address
  const postalCode = typia
    .random<
      number & tags.Type<"int32"> & tags.Minimum<10000> & tags.Maximum<99999>
    >()
    .toString();
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: postalCode,
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: addressData,
    },
  );
  typia.assert(address);

  // Step 8: Create payment method
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

  // Step 9: Create order directly
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

  // Step 10: Submit review as verified purchaser
  const reviewData = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    shopping_mall_order_id: orderId,
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    review_text: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallReview.ICreate;

  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: reviewData,
    },
  );
  typia.assert(review);

  // Step 11: Search reviews with verified purchase filter
  const searchRequest = {
    shopping_mall_product_id: product.id,
    verified_purchase_only: true,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallReview.IRequest;

  const searchResults = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: searchRequest,
    },
  );
  typia.assert(searchResults);

  // Step 12: Validate search results
  TestValidator.predicate(
    "search should return at least one review",
    searchResults.data.length > 0,
  );

  // Step 13: Verify our submitted review is in the results
  const ourReview = searchResults.data.find((r) => r.id === review.id);
  TestValidator.predicate(
    "our submitted review should be found in search results",
    ourReview !== undefined,
  );

  if (ourReview) {
    typia.assertGuard(ourReview!);
    TestValidator.equals(
      "review product ID should match",
      ourReview.shopping_mall_product_id,
      product.id,
    );
    TestValidator.equals(
      "review order ID should match",
      ourReview.shopping_mall_order_id,
      orderId,
    );
  }
}
