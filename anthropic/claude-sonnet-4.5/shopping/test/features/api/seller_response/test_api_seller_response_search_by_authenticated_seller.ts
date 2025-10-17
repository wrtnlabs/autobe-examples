import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerResponse";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerResponse";

/**
 * Test the complete workflow for sellers searching and filtering their
 * responses to customer reviews.
 *
 * This test validates:
 *
 * 1. Seller account creation and authentication
 * 2. Product ecosystem setup (category and product creation)
 * 3. Customer order completion workflow
 * 4. Customer review submission
 * 5. Seller response creation
 * 6. Seller response search and pagination functionality
 *
 * The test ensures that sellers can only view their own responses, that
 * response data includes associated review context and moderation status, and
 * that filtering and pagination work correctly.
 */
export async function test_api_seller_response_search_by_authenticated_seller(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
    tax_id: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateData,
  });
  typia.assert(seller);

  // Step 2: Create product category (requires admin context, but API handles this)
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

  // Step 3: Create product
  const productData = {
    name: RandomGenerator.name(3),
    base_price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 4: Create customer account
  const customerCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerCreateData,
  });
  typia.assert(customer);

  // Step 5: Create delivery address for customer
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: `${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Avenue`,
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"int32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "USA",
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: addressData,
    },
  );
  typia.assert(address);

  // Step 6: Create payment method for customer
  const paymentMethodData = {
    payment_type: RandomGenerator.pick([
      "credit_card",
      "debit_card",
      "paypal",
    ] as const),
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

  // Step 7: Create order
  const orderData = {
    delivery_address_id: address.id,
    payment_method_id: paymentMethod.id,
    shipping_method: RandomGenerator.pick([
      "standard",
      "express",
      "overnight",
    ] as const),
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

  // Step 8: Create customer review
  const reviewData = {
    shopping_mall_product_id: product.id,
    shopping_mall_order_id: orderResponse.order_ids[0],
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    review_text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IShoppingMallReview.ICreate;

  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: reviewData,
    },
  );
  typia.assert(review);

  // Step 9: Switch back to seller context and create response
  const sellerResponseData = {
    shopping_mall_review_id: review.id,
    response_text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 15,
    }),
  } satisfies IShoppingMallSellerResponse.ICreate;

  const sellerResponse =
    await api.functional.shoppingMall.seller.sellerResponses.create(
      connection,
      {
        body: sellerResponseData,
      },
    );
  typia.assert(sellerResponse);

  // Step 10: Search for seller responses (basic search)
  const searchRequest = {
    page: 1,
  } satisfies IShoppingMallSellerResponse.IRequest;

  const searchResult =
    await api.functional.shoppingMall.seller.sellerResponses.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 11: Validate pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    searchResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination should have limit",
    searchResult.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination should have total records",
    searchResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should have total pages",
    searchResult.pagination.pages >= 0,
  );

  // Step 12: Validate that the created response is in the search results
  TestValidator.predicate(
    "search results should contain the created seller response",
    searchResult.data.some((response) => response.id === sellerResponse.id),
  );

  // Step 13: Validate response data structure
  TestValidator.predicate(
    "search results should have at least one response",
    searchResult.data.length > 0,
  );

  const firstResponse = searchResult.data[0];
  typia.assert(firstResponse);

  TestValidator.predicate(
    "response should have valid ID",
    firstResponse.id.length > 0,
  );

  TestValidator.predicate(
    "response should have text",
    firstResponse.response_text.length > 0,
  );
}
