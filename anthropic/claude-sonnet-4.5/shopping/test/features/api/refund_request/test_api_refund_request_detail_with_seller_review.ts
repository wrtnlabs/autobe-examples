import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieving refund request details after seller review and approval.
 *
 * This test validates the complete refund approval workflow from customer
 * submission through seller review to final detail retrieval. It ensures that
 * all seller review information is correctly stored and retrieved.
 *
 * Workflow steps:
 *
 * 1. Create customer account for refund submission
 * 2. Create seller account for refund review
 * 3. Seller creates product for order
 * 4. Customer creates delivery address
 * 5. Customer creates payment method
 * 6. Customer places order
 * 7. Customer submits refund request
 * 8. Seller reviews and approves refund
 * 9. Customer retrieves refund details and validates seller review data
 */
export async function test_api_refund_request_detail_with_seller_review(
  connection: api.IConnection,
) {
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

  const sellerData = {
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
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  const productData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: addressData,
    },
  );
  typia.assert(address);

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
    "order IDs array is not empty",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0] satisfies string as string;

  const refundAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
  >() satisfies number as number;

  const refundRequestData = {
    refund_reason: RandomGenerator.pick([
      "defective_damaged",
      "wrong_item",
      "does_not_match_description",
      "changed_mind",
      "found_better_price",
      "quality_not_expected",
      "other",
    ] as const),
    refund_description: RandomGenerator.paragraph({ sentences: 5 }),
    refund_amount_requested: refundAmount,
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

  const refundUpdateData = {
    refund_status: "approved",
  } satisfies IShoppingMallRefundRequest.IUpdate;

  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refundRequests.update(connection, {
      refundRequestId: refundRequest.id,
      body: refundUpdateData,
    });
  typia.assert(updatedRefundRequest);

  const retrievedRefundRequest =
    await api.functional.shoppingMall.customer.refundRequests.at(connection, {
      refundRequestId: refundRequest.id,
    });
  typia.assert(retrievedRefundRequest);

  TestValidator.equals(
    "refund request id matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refund status is approved",
    retrievedRefundRequest.refund_status,
    "approved",
  );
  TestValidator.predicate(
    "seller reviewer id is present",
    retrievedRefundRequest.reviewer_seller_id !== null &&
      retrievedRefundRequest.reviewer_seller_id !== undefined,
  );
  TestValidator.predicate(
    "reviewed timestamp is present",
    retrievedRefundRequest.reviewed_at !== null &&
      retrievedRefundRequest.reviewed_at !== undefined,
  );
  TestValidator.equals(
    "original requested amount matches",
    retrievedRefundRequest.refund_amount_requested,
    refundAmount,
  );
  TestValidator.equals(
    "order ID matches",
    retrievedRefundRequest.shopping_mall_order_id,
    orderId,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedRefundRequest.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "seller reviewer ID matches",
    retrievedRefundRequest.reviewer_seller_id,
    seller.id,
  );
}
