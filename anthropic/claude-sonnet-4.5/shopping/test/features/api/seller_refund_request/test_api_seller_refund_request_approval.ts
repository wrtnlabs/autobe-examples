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
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test the complete seller refund approval workflow.
 *
 * This test validates the end-to-end refund approval process where a customer
 * requests a refund for a delivered order and the seller reviews and approves
 * it.
 *
 * Workflow:
 *
 * 1. Create customer account for order placement
 * 2. Create seller account for product management and refund approval
 * 3. Create admin account for category management
 * 4. Admin creates product category
 * 5. Seller creates product and SKU variant
 * 6. Customer creates delivery address
 * 7. Customer creates payment method
 * 8. Customer adds product to cart
 * 9. Customer creates order from cart
 * 10. Customer submits refund request
 * 11. Seller approves the refund request
 * 12. Validate refund status transitions and approval details
 */
export async function test_api_seller_refund_request_approval(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
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

  // Step 2: Create seller account
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
    business_address: RandomGenerator.paragraph({ sentences: 5 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 3: Create admin account for category creation
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

  // Step 4: Create product category (admin is authenticated)
  const categoryData = {
    name: RandomGenerator.name(1),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 5: Switch to seller for product creation (re-authenticate as seller)
  const sellerReauth = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(sellerReauth);

  const productData = {
    name: RandomGenerator.name(2),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 6: Create SKU variant
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(8),
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

  // Step 7: Switch to customer for order placement (re-authenticate as customer)
  const customerReauth = await api.functional.auth.customer.join(connection, {
    body: customerData,
  });
  typia.assert(customerReauth);

  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 5 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "USA",
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

  // Step 9: Add product to cart
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItemData = {
    shopping_mall_sku_id: sku.id,
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: cartItemData,
    });
  typia.assert(cartItem);

  // Step 10: Create order from cart
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
    "order created successfully",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];

  // Step 11: Submit refund request
  const refundAmount = sku.price * cartItem.quantity;
  const refundRequestData = {
    refund_reason: "defective_damaged",
    refund_description: RandomGenerator.paragraph({ sentences: 10 }),
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

  TestValidator.equals(
    "refund status initially pending_review",
    refundRequest.refund_status,
    "pending_review",
  );

  TestValidator.equals(
    "refund amount requested matches",
    refundRequest.refund_amount_requested,
    refundAmount,
  );

  // Step 12: Switch to seller for refund approval (re-authenticate as seller)
  const sellerReauth2 = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(sellerReauth2);

  // Step 13: Approve the refund request
  const refundUpdateData = {
    refund_status: "approved",
  } satisfies IShoppingMallRefundRequest.IUpdate;

  const approvedRefund =
    await api.functional.shoppingMall.seller.refundRequests.update(connection, {
      refundRequestId: refundRequest.id,
      body: refundUpdateData,
    });
  typia.assert(approvedRefund);

  // Step 14: Validate refund approval
  TestValidator.equals(
    "refund status changed to approved",
    approvedRefund.refund_status,
    "approved",
  );

  TestValidator.predicate(
    "refund request ID matches",
    approvedRefund.id === refundRequest.id,
  );

  TestValidator.equals(
    "refund amount requested unchanged",
    approvedRefund.refund_amount_requested,
    refundAmount,
  );

  TestValidator.predicate(
    "seller response deadline is set",
    approvedRefund.seller_response_deadline !== null &&
      approvedRefund.seller_response_deadline !== undefined,
  );
}
