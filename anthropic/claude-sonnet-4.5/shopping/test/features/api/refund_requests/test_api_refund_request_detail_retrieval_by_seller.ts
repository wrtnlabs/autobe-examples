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
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test seller's ability to retrieve detailed refund request information.
 *
 * This test validates the complete workflow where a seller retrieves detailed
 * information about a refund request submitted by a customer for an order
 * containing the seller's products. It ensures proper role-based access control
 * and verifies that sellers can access all necessary refund request details to
 * make informed approval decisions.
 *
 * Workflow Steps:
 *
 * 1. Create admin account and category
 * 2. Create seller account and product with SKU
 * 3. Create customer account with address and payment method
 * 4. Place order and submit refund request
 * 5. Seller retrieves refund request details
 * 6. Validate complete refund request information
 */
export async function test_api_refund_request_detail_retrieval_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
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

  // Step 2: Create product category
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

  // Step 3: Create seller account and authenticate
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(3),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create product
  const productData = {
    name: RandomGenerator.name(4),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
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
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 6: Create customer account and authenticate
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
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 4 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
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

  // Step 9: Place order
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
    "order should be created successfully",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];

  // Step 10: Submit refund request
  const refundReasons = [
    "defective_damaged",
    "wrong_item",
    "does_not_match_description",
    "changed_mind",
    "found_better_price",
    "quality_not_expected",
    "other",
  ] as const;
  const selectedReason = RandomGenerator.pick(refundReasons);

  const refundRequestData = {
    refund_reason: selectedReason,
    refund_description: RandomGenerator.content({ paragraphs: 2 }),
    refund_amount_requested: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1>
    >(),
  } satisfies IShoppingMallOrder.IRefundCreate;

  const refundRequest =
    await api.functional.shoppingMall.customer.orders.refund.createRefund(
      connection,
      {
        orderId: orderId,
        body: refundRequestData,
      },
    );
  typia.assert(refundRequest);

  // Step 11: Retrieve refund request details as seller
  const retrievedRefundRequest =
    await api.functional.shoppingMall.seller.refundRequests.at(connection, {
      refundRequestId: refundRequest.id,
    });
  typia.assert(retrievedRefundRequest);

  // Step 12: Validate refund request details
  TestValidator.equals(
    "refund request ID should match",
    retrievedRefundRequest.id,
    refundRequest.id,
  );

  TestValidator.equals(
    "order ID should match",
    retrievedRefundRequest.shopping_mall_order_id,
    orderId,
  );

  TestValidator.equals(
    "customer ID should match",
    retrievedRefundRequest.shopping_mall_customer_id,
    customer.id,
  );

  TestValidator.equals(
    "refund reason should match",
    retrievedRefundRequest.refund_reason,
    selectedReason,
  );

  TestValidator.equals(
    "refund description should match",
    retrievedRefundRequest.refund_description,
    refundRequestData.refund_description,
  );

  TestValidator.equals(
    "refund amount requested should match",
    retrievedRefundRequest.refund_amount_requested,
    refundRequestData.refund_amount_requested,
  );
}
