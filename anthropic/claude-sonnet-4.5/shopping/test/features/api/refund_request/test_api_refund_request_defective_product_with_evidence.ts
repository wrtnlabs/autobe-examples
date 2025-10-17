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
 * Test refund request submission for defective product with comprehensive
 * evidence.
 *
 * This test validates the complete workflow for customers submitting refund
 * requests for defective or damaged products. The test creates the full order
 * lifecycle from product creation through order completion, then submits a
 * refund request with detailed evidence and validates proper capture of all
 * information for review.
 *
 * Steps:
 *
 * 1. Create admin account and product category
 * 2. Create seller account and register product with SKU
 * 3. Create customer account with delivery address and payment method
 * 4. Create and complete order
 * 5. Submit refund request with defective_damaged reason and detailed description
 * 6. Validate refund request creation and workflow initialization
 */
export async function test_api_refund_request_defective_product_with_evidence(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and product category
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
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Create seller account and product with SKU
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<50000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<50000>
        >(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 3: Create customer account with delivery address and payment method
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
        address_line1: RandomGenerator.paragraph({ sentences: 5 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
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

  // Step 4: Create and complete order
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
    "order created successfully",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];
  typia.assert(orderId);

  // Step 5: Submit refund request with defective_damaged reason and detailed description
  const refundRequest =
    await api.functional.shoppingMall.customer.orders.refund.createRefund(
      connection,
      {
        orderId: orderId,
        body: {
          refund_reason: "defective_damaged",
          refund_description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
          refund_amount_requested: sku.price,
        } satisfies IShoppingMallOrder.IRefundCreate,
      },
    );
  typia.assert(refundRequest);

  // Step 6: Validate refund request creation and workflow initialization
  TestValidator.equals(
    "refund request order matches",
    refundRequest.shopping_mall_order_id,
    orderId,
  );
  TestValidator.equals(
    "refund request customer matches",
    refundRequest.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "refund reason is defective_damaged",
    refundRequest.refund_reason,
    "defective_damaged",
  );
  TestValidator.predicate(
    "refund description is detailed",
    refundRequest.refund_description.length > 20,
  );
  TestValidator.equals(
    "refund amount requested matches SKU price",
    refundRequest.refund_amount_requested,
    sku.price,
  );
  TestValidator.equals(
    "refund status is pending_review",
    refundRequest.refund_status,
    "pending_review",
  );
  TestValidator.predicate(
    "seller response deadline is set",
    refundRequest.seller_response_deadline !== null &&
      refundRequest.seller_response_deadline !== undefined,
  );
  TestValidator.predicate(
    "refund request timestamp is set",
    refundRequest.requested_at !== null &&
      refundRequest.requested_at !== undefined,
  );
}
