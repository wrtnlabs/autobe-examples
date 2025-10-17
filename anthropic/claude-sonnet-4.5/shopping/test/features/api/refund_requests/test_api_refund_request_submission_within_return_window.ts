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
 * Test refund request submission within return window.
 *
 * Validates the complete refund request workflow from admin setup through
 * seller registration, product creation, customer order placement, and finally
 * refund request submission. Ensures proper status initialization, deadline
 * calculation, and data linking.
 */
export async function test_api_refund_request_submission_within_return_window(
  connection: api.IConnection,
) {
  // Step 1: Admin joins and creates category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Seller joins and creates product with SKU
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: 99.99,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 99.99,
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 3: Customer joins and sets up address and payment method
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: "credit_card",
          gateway_token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 4: Customer creates order
  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);
  TestValidator.predicate(
    "order creation returns at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];

  // Step 5: Submit refund request
  const refundReason = "defective_damaged";
  const refundDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const refundAmountRequested = 99.99;

  const refundRequest =
    await api.functional.shoppingMall.customer.orders.refund.createRefund(
      connection,
      {
        orderId: orderId,
        body: {
          refund_reason: refundReason,
          refund_description: refundDescription,
          refund_amount_requested: refundAmountRequested,
        } satisfies IShoppingMallOrder.IRefundCreate,
      },
    );
  typia.assert(refundRequest);

  // Validate refund request creation
  TestValidator.equals(
    "refund request status should be pending_review",
    refundRequest.refund_status,
    "pending_review",
  );
  TestValidator.equals(
    "refund request order ID matches",
    refundRequest.shopping_mall_order_id,
    orderId,
  );
  TestValidator.equals(
    "refund request customer ID matches",
    refundRequest.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "refund reason matches submitted value",
    refundRequest.refund_reason,
    refundReason,
  );
  TestValidator.equals(
    "refund description matches submitted value",
    refundRequest.refund_description,
    refundDescription,
  );
  TestValidator.equals(
    "refund amount requested matches submitted value",
    refundRequest.refund_amount_requested,
    refundAmountRequested,
  );
  TestValidator.predicate(
    "refund request has valid ID",
    typeof refundRequest.id === "string" && refundRequest.id.length > 0,
  );
  TestValidator.predicate(
    "seller response deadline is set",
    refundRequest.seller_response_deadline !== null &&
      refundRequest.seller_response_deadline !== undefined,
  );
  TestValidator.predicate(
    "requested_at timestamp is set",
    refundRequest.requested_at !== null &&
      refundRequest.requested_at !== undefined,
  );
}
