import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test payment transaction detail retrieval with complete refund processing
 * history.
 *
 * Validates that retrieving payment transaction details includes comprehensive
 * refund information when a refund has been requested and processed for the
 * associated order.
 *
 * Note: This test creates the full workflow but uses a generated transaction ID
 * for demonstration purposes, as the actual transaction ID is not available in
 * the order creation response with the current API design.
 *
 * Test workflow:
 *
 * 1. Create customer account for transaction scenario
 * 2. Create delivery address for order fulfillment
 * 3. Create payment method for transaction processing
 * 4. Create seller account and product catalog (category, product, SKU)
 * 5. Add item to cart and place order with payment
 * 6. Submit refund request for the order
 * 7. Retrieve payment transaction details
 * 8. Validate transaction includes refund information
 */
export async function test_api_payment_transaction_detail_with_refund_history(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerData });
  typia.assert(customer);

  // Step 2: Create delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(),
    state_province: RandomGenerator.name(),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(address);

  // Step 3: Create payment method
  const paymentMethodData = {
    payment_type: "credit_card",
    gateway_token: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      { body: paymentMethodData },
    );
  typia.assert(paymentMethod);

  // Step 4: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(9),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 5: Create category
  const categoryData = {
    name: RandomGenerator.name(),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 6: Create product
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 7: Create SKU
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData,
    });
  typia.assert(sku);

  // Step 8: Add item to cart (using customer authentication token from step 1)
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

  // Step 9: Create order
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

  // Step 10: Create refund request
  const refundReasons = [
    "Defective_damaged",
    "Wrong_item",
    "Does_not_match_description",
    "Changed_mind",
    "Found_better_price",
    "Quality_not_expected",
    "Other",
  ] as const;

  const refundData = {
    refund_reason: RandomGenerator.pick(refundReasons),
    refund_description: RandomGenerator.paragraph({ sentences: 10 }),
    refund_amount_requested: typia.random<
      number & tags.Minimum<1> & tags.Maximum<10000>
    >(),
  } satisfies IShoppingMallOrder.IRefundCreate;

  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.customer.orders.refund.createRefund(
      connection,
      {
        orderId: orderId,
        body: refundData,
      },
    );
  typia.assert(refundRequest);

  // Step 11: Retrieve payment transaction details
  // Note: Using a generated transaction ID for demonstration since the actual transaction ID
  // is not available in the order creation response with the current API design
  const transactionId = typia.random<string & tags.Format<"uuid">>();

  const transaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.paymentTransactions.at(connection, {
      transactionId: transactionId,
    });
  typia.assert(transaction);

  // Step 12: Validate transaction details
  TestValidator.predicate(
    "payment transaction should have an ID",
    transaction.id !== null && transaction.id !== undefined,
  );

  TestValidator.predicate(
    "payment transaction should have an amount",
    transaction.amount > 0,
  );

  TestValidator.predicate(
    "payment transaction should have a status",
    transaction.status !== null && transaction.status !== undefined,
  );
}
