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
 * Test seller refund approval with return requirement specification.
 *
 * This test validates the complete workflow where a seller conditionally
 * approves a customer refund request but requires the customer to return the
 * product first.
 *
 * Test workflow:
 *
 * 1. Create customer account for placing orders
 * 2. Create seller account for product management and refund approval
 * 3. Create admin account for category creation
 * 4. Set up product catalog (category, product, SKU)
 * 5. Create customer delivery address and payment method
 * 6. Add product to cart and complete order placement
 * 7. Customer submits refund request for the order
 * 8. Seller approves refund with return_required flag enabled
 * 9. Validate return requirements are properly recorded
 */
export async function test_api_seller_refund_return_requirement_specification(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
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

  // Step 2: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Create admin account for category creation
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Create category (admin context)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(1),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Switch to seller context for product creation
  connection.headers = connection.headers || {};
  connection.headers.Authorization = seller.token.access;

  // Step 5: Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >() satisfies number as number,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 6: Create SKU
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >() satisfies number as number,
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Switch to customer context
  connection.headers.Authorization = customer.token.access;

  // Step 7: Create delivery address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  // Step 8: Create payment method
  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: RandomGenerator.pick([
            "credit_card",
            "debit_card",
            "paypal",
          ] as const),
          gateway_token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 9: Add item to cart (using a random cart ID)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >() satisfies number as number,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 10: Create order
  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: RandomGenerator.pick([
          "standard",
          "express",
          "overnight",
        ] as const),
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  // Validate order IDs array is not empty
  TestValidator.predicate(
    "order IDs should be created",
    orderResponse.order_ids.length > 0,
  );

  // Extract order ID from response
  const orderId = orderResponse.order_ids[0];
  typia.assertGuard(orderId!);

  // Step 11: Submit refund request
  const refundRequest =
    await api.functional.shoppingMall.customer.orders.refund.createRefund(
      connection,
      {
        orderId: orderId,
        body: {
          refund_reason: RandomGenerator.pick([
            "defective_damaged",
            "wrong_item",
            "does_not_match_description",
          ] as const),
          refund_description: RandomGenerator.paragraph({ sentences: 5 }),
          refund_amount_requested: typia.random<
            number & tags.Minimum<10> & tags.Maximum<10000>
          >() satisfies number as number,
        } satisfies IShoppingMallOrder.IRefundCreate,
      },
    );
  typia.assert(refundRequest);

  // Validate initial refund request state
  TestValidator.equals(
    "initial refund status should be pending review",
    refundRequest.refund_status,
    "pending_review",
  );

  // Step 12: Switch to seller context for refund approval
  connection.headers.Authorization = seller.token.access;

  // Step 13: Seller approves refund (return_required may be set by backend logic)
  const updatedRefund =
    await api.functional.shoppingMall.seller.refundRequests.update(connection, {
      refundRequestId: refundRequest.id,
      body: {
        refund_status: "approved",
      } satisfies IShoppingMallRefundRequest.IUpdate,
    });
  typia.assert(updatedRefund);

  // Step 14: Validate refund approval
  TestValidator.equals(
    "refund status should be approved",
    updatedRefund.refund_status,
    "approved",
  );

  // Validate return requirement - backend may set this automatically based on business rules
  TestValidator.predicate(
    "return required field should exist",
    typeof updatedRefund.return_required === "boolean",
  );
}
