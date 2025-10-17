import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellation";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellation";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test customer cancellation history retrieval with search and filter
 * functionality.
 *
 * This test validates the complete customer cancellation history workflow
 * including:
 *
 * 1. Setup: Creates seller, category, product, SKU, customer, address, payment
 *    method
 * 2. Order flow: Creates cart item, places order, requests cancellation
 * 3. Search testing: Retrieves cancellation history with various filters and
 *    pagination
 * 4. Validation: Ensures data isolation, correct filtering, and proper pagination
 */
export async function test_api_customer_cancellation_history_search_and_filter(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(),
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
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    base_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 4: Create SKU for the product
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
    >(),
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 5: Create customer account
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

  // Step 6: Create delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 6,
    }),
    city: RandomGenerator.name(),
    state_province: RandomGenerator.name(),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.pick(["USA", "Korea", "Japan"] as const),
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: addressData,
    },
  );
  typia.assert(address);

  // Step 7: Create payment method
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

  // Step 8: Add item to cart (using random cart ID as cart is auto-created per customer session)
  const cartId = typia.random<string & tags.Format<"uuid">>();

  const cartItemData = {
    shopping_mall_sku_id: sku.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: cartItemData,
    });
  typia.assert(cartItem);

  // Step 9: Create order
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
    "order should be created successfully",
    orderResponse.order_ids.length > 0,
  );

  // Step 10: Request cancellation for the order
  const cancellationReason = RandomGenerator.pick([
    "customer_changed_mind",
    "found_better_price",
    "order_mistake",
    "delivery_too_long",
  ] as const);

  const cancellationRequest = {
    cancellation_reason: cancellationReason,
  } satisfies IShoppingMallOrder.ICancelRequest;

  const cancellationResponse =
    await api.functional.shoppingMall.customer.orders.cancel(connection, {
      orderId: orderResponse.order_ids[0],
      body: cancellationRequest,
    });
  typia.assert(cancellationResponse);

  // Validate cancellation response structure
  TestValidator.equals(
    "cancellation order ID should match",
    cancellationResponse.order_id,
    orderResponse.order_ids[0],
  );

  TestValidator.predicate(
    "cancellation should have valid status",
    cancellationResponse.cancellation_status.length > 0,
  );

  // Step 11: Test basic cancellation history retrieval
  const basicSearchRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCancellation.IRequest;

  const basicSearchResult =
    await api.functional.shoppingMall.customer.cancellations.index(connection, {
      body: basicSearchRequest,
    });
  typia.assert(basicSearchResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    basicSearchResult.pagination.current === 1 &&
      basicSearchResult.pagination.limit === 10 &&
      basicSearchResult.pagination.records >= 1,
  );

  // Validate that cancellation data exists
  TestValidator.predicate(
    "should return at least one cancellation",
    basicSearchResult.data.length >= 1,
  );

  // Find our cancellation in results
  const foundCancellation = basicSearchResult.data.find(
    (c) => c.id === cancellationResponse.cancellation_id,
  );

  if (foundCancellation) {
    typia.assertGuard(foundCancellation);

    TestValidator.equals(
      "cancellation ID should match",
      foundCancellation.id,
      cancellationResponse.cancellation_id,
    );

    TestValidator.equals(
      "cancellation status should match",
      foundCancellation.cancellation_status,
      cancellationResponse.cancellation_status,
    );
  }

  // Step 12: Test filtering by cancellation status
  const statusFilterRequest = {
    page: 1,
    limit: 10,
    cancellation_status: cancellationResponse.cancellation_status,
  } satisfies IShoppingMallCancellation.IRequest;

  const statusFilterResult =
    await api.functional.shoppingMall.customer.cancellations.index(connection, {
      body: statusFilterRequest,
    });
  typia.assert(statusFilterResult);

  // Validate all results match the status filter
  TestValidator.predicate(
    "all results should match status filter",
    statusFilterResult.data.every(
      (c) => c.cancellation_status === cancellationResponse.cancellation_status,
    ),
  );

  // Step 13: Test pagination with different page sizes
  const smallPageRequest = {
    page: 1,
    limit: 1,
  } satisfies IShoppingMallCancellation.IRequest;

  const smallPageResult =
    await api.functional.shoppingMall.customer.cancellations.index(connection, {
      body: smallPageRequest,
    });
  typia.assert(smallPageResult);

  TestValidator.predicate(
    "should return at most 1 item with limit=1",
    smallPageResult.data.length <= 1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    smallPageResult.pagination.limit,
    1,
  );
}
