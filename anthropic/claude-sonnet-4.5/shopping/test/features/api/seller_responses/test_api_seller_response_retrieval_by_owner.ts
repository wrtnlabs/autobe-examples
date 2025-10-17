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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerResponse";

/**
 * Test seller response retrieval by owner.
 *
 * This test validates the complete workflow for sellers to retrieve their own
 * responses to customer reviews. It covers the following steps:
 *
 * 1. Create admin account and category for product creation
 * 2. Create seller account and authenticate
 * 3. Create a product that will receive reviews
 * 4. Create customer account with delivery address and payment method
 * 5. Complete order workflow (create and process order)
 * 6. Customer submits a review for the product
 * 7. Seller responds to the customer review
 * 8. Seller retrieves the response details
 * 9. Validate all response fields are correct including text, ID, and associated
 *    data
 */
export async function test_api_seller_response_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category creation
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
    name: RandomGenerator.name(),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 4: Create product as seller
  const productData = {
    name: RandomGenerator.name(),
    base_price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 5: Create customer account
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

  // Step 6: Create delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(address);

  // Step 7: Create payment method
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

  // Step 8: Create order
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
    "order created with valid IDs",
    orderResponse.order_ids.length > 0,
  );

  // Step 9: Customer submits review
  const reviewData = {
    shopping_mall_product_id: product.id,
    shopping_mall_order_id: orderResponse.order_ids[0],
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    review_text: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallReview.ICreate;

  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: reviewData,
    });
  typia.assert(review);

  // Step 10: Seller responds to review
  const responseText = RandomGenerator.content({ paragraphs: 1 });
  const sellerResponseData = {
    shopping_mall_review_id: review.id,
    response_text: responseText,
  } satisfies IShoppingMallSellerResponse.ICreate;

  const createdResponse: IShoppingMallSellerResponse =
    await api.functional.shoppingMall.seller.sellerResponses.create(
      connection,
      {
        body: sellerResponseData,
      },
    );
  typia.assert(createdResponse);

  // Step 11: Retrieve the seller response by ID
  const retrievedResponse: IShoppingMallSellerResponse =
    await api.functional.shoppingMall.seller.sellerResponses.at(connection, {
      responseId: createdResponse.id,
    });
  typia.assert(retrievedResponse);

  // Step 12: Validate retrieved response matches created response
  TestValidator.equals(
    "response ID matches",
    retrievedResponse.id,
    createdResponse.id,
  );
  TestValidator.equals(
    "response text matches",
    retrievedResponse.response_text,
    responseText,
  );
}
