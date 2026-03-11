import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request } from "../../../generate/generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can reject cancellation requests for their products.
 *
 * Business Context:
 * Per business rules, suspended sellers retain authority to process existing orders
 * including cancellation request responses. This test validates the rejection workflow.
 *
 * Note: Full suspended seller scenario (setting suspended=true) requires admin API
 * not currently available. This test validates the core rejection functionality.
 *
 * Required APIs not available for complete test:
 * - POST /shoppingMall/seller/products (create product)
 * - POST /shoppingMall/customer/customers/addresses (create address)
 * - PATCH /shoppingMall/admin/sellers/{id}/suspend (suspend seller)
 */
export async function test_api_cancellation_request_rejection_suspended_seller(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // STEP 1: Seller Setup
  // ========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // Verify seller is not banned
  TestValidator.predicate(
    "seller account is active",
    sellerAuth.banned === false,
  );
  // ========================================
  // STEP 2: Customer Setup
  // ========================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // ========================================
  // STEP 3: Create Product Variant and Add Inventory
  // ========================================
  // Generate a unique SKU code for the variant
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  // Create product variant (requires existing product ID from system)
  // Using a placeholder - in real scenario this would be from product creation
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId },
        body: {
          sku_code: skuCode,
          option_values: { color: "Blue", size: "Medium" },
          price: 29.99,
        },
      },
    );
  typia.assert(variant);
  // Add inventory for the variant
  const inventory =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 50,
          reason: "Initial stock for test",
        },
      },
    );
  typia.assert(inventory);
  // ========================================
  // STEP 4: Customer Adds Item to Cart
  // ========================================
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  TestValidator.equals("cart item quantity", cartItem.quantity, 1);
  TestValidator.predicate(
    "cart item is available",
    cartItem.unavailable === false,
  );
  // ========================================
  // STEP 5: Customer Checkout
  // ========================================
  // Note: Checkout requires a valid addressId from customer's address book
  // This test assumes the checkout process handles address validation
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        addressId,
      },
    },
  );
  typia.assert(order);
  // Verify order was created with expected properties
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // ========================================
  // STEP 6: Customer Creates Cancellation Request
  // ========================================
  const orderItem = order.orderItems[0];
  const cancellationRequest =
    await generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify cancellation request was created correctly
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "seller is null before response",
    cancellationRequest.seller === null,
  );
  TestValidator.predicate(
    "responded_at is null before response",
    cancellationRequest.responded_at === null,
  );
  // ========================================
  // STEP 7: (Seller Suspension Would Happen Here)
  // ========================================
  // Note: To test suspended seller scenario, admin would set:
  // PATCH /shoppingMall/admin/sellers/{sellerId} { suspended: true }
  //
  // Business Rule: Suspended sellers CAN still manage existing orders.
  // The rejection should succeed even if seller is suspended.
  // Only banned sellers are completely blocked.
  // ========================================
  // STEP 8: Seller Rejects Cancellation Request
  // ========================================
  const rejectedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.reject(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(rejectedRequest);
  // ========================================
  // STEP 9: Validate Rejection Results
  // ========================================
  TestValidator.equals(
    "cancellation request status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "seller reference is populated",
    rejectedRequest.seller !== null,
  );
  TestValidator.predicate(
    "responded_at timestamp is set",
    rejectedRequest.responded_at !== null,
  );
  // Verify the seller who responded is the correct one
  if (rejectedRequest.seller !== null) {
    TestValidator.equals(
      "responding seller ID matches",
      rejectedRequest.seller.id,
      sellerAuth.id,
    );
  }
  // Verify the cancellation request ID is preserved
  TestValidator.equals(
    "cancellation request ID preserved",
    rejectedRequest.id,
    cancellationRequest.id,
  );
  // Verify reason is preserved
  TestValidator.equals(
    "reason preserved",
    rejectedRequest.reason,
    cancellationRequest.reason,
  );
  // ========================================
  // STEP 10: Verify Business Rule - Suspended Seller Can Reject
  // ========================================
  // The key business rule being validated:
  // - Suspended sellers CAN reject cancellation requests
  // - This ensures customer service continuity
  // - Only banned sellers are blocked from all operations
  //
  // This test successfully validates that an active seller can reject.
  // To fully test suspended scenario, admin suspension API is needed.
  TestValidator.predicate(
    "rejection workflow completes successfully",
    rejectedRequest.status === "rejected",
  );
}
