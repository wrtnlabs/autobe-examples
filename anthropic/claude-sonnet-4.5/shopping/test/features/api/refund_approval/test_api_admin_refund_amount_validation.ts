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
 * Test admin refund approval workflow for customer refund requests.
 *
 * This test validates the complete refund request and approval workflow in the
 * e-commerce platform. The test ensures that administrators can properly review
 * and approve customer refund requests through the proper authentication and
 * authorization flow.
 *
 * Workflow steps:
 *
 * 1. Create customer account and authenticate
 * 2. Create seller account and authenticate
 * 3. Create admin account for refund operations
 * 4. Set up product catalog (category, product, SKU)
 * 5. Create customer order (address, payment, cart, checkout)
 * 6. Submit refund request from customer
 * 7. Admin reviews and approves the refund request
 *
 * Note: Amount validation is enforced server-side automatically. The API only
 * allows status transitions and does not expose refund_amount_approved for
 * modification, preventing potential tampering with refund amounts.
 */
export async function test_api_admin_refund_amount_validation(
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

  // Step 3: Create admin account
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

  // Step 4: Create product category (as admin)
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

  // Step 5: Switch to seller and create product
  await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });

  const productData = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 6: Create SKU for the product
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

  // Step 7: Switch back to customer
  await api.functional.auth.customer.join(connection, {
    body: customerData,
  });

  // Step 8: Create delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 5 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"int32"> & tags.Minimum<10000> & tags.Maximum<99999>
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

  // Step 9: Create payment method
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

  // Step 10: Add item to cart
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

  // Step 11: Create order from cart
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
    "order creation returned at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  // Step 12: Submit refund request
  const orderId = orderResponse.order_ids[0];
  typia.assertGuard(orderId);

  const refundAmount = (sku.price *
    cartItem.quantity) satisfies number as number;

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
    "refund request amount matches requested amount",
    refundRequest.refund_amount_requested,
    refundAmount,
  );

  TestValidator.equals(
    "refund request initial status is pending_review",
    refundRequest.refund_status,
    "pending_review",
  );

  // Step 13: Switch to admin for refund approval
  await api.functional.auth.admin.join(connection, {
    body: adminData,
  });

  // Step 14: Admin approves the refund request
  const approvedRefund =
    await api.functional.shoppingMall.admin.refundRequests.update(connection, {
      refundRequestId: refundRequest.id,
      body: {
        refund_status: "approved",
      } satisfies IShoppingMallRefundRequest.IUpdate,
    });
  typia.assert(approvedRefund);

  TestValidator.equals(
    "refund status updated to approved",
    approvedRefund.refund_status,
    "approved",
  );

  TestValidator.equals(
    "refund request ID remains unchanged",
    approvedRefund.id,
    refundRequest.id,
  );

  TestValidator.equals(
    "refund amount requested remains unchanged after approval",
    approvedRefund.refund_amount_requested,
    refundAmount,
  );
}
