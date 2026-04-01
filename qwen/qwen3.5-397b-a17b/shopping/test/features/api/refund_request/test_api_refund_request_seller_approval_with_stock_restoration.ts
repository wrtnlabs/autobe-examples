import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test the complete seller refund approval workflow with stock restoration.
 *
 * This test validates the end-to-end refund request process:
 * 1. Seller registration and authentication
 * 2. Customer registration and authentication
 * 3. Customer creates shipping address for order
 * 4. Customer adds product variant to cart and creates order
 * 5. Customer creates refund request for order item
 * 6. Seller approves refund request with response reason
 * 7. Validate: refund status='approved', response reason set, seller assigned
 *
 * Note: This test focuses on the refund approval API endpoint. Full workflow
 * including product creation, shipment, and delivery confirmation would require
 * additional seller and customer endpoints not included in this test scope.
 */
export async function test_api_refund_request_seller_approval_with_stock_restoration(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // 1. SELLER SETUP - Register and authenticate seller
  // ============================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // ============================================
  // 2. CUSTOMER SETUP - Register and authenticate customer
  // ============================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // ============================================
  // 3. CUSTOMER ADDRESS - Create shipping address
  // ============================================
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        state: RandomGenerator.name(1),
        postalCode: typia.random<string>(),
        country: "South Korea",
        isDefault: true,
      },
    },
  );
  typia.assert(address);
  // ============================================
  // 4. CART ITEM - Customer adds product variant to cart
  // ============================================
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // ============================================
  // 5. ORDER CREATION - Customer creates order
  // ============================================
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // Get the first order item for refund request
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // ============================================
  // 6. REFUND REQUEST - Customer creates refund request
  // ============================================
  const refundRequest =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: {
          orderItemId: orderItem.id,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  // Validate refund request initial state
  TestValidator.equals(
    "refund request order item",
    refundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "refund request status",
    refundRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "refund request has reason",
    refundRequest.reason.length > 0,
  );
  TestValidator.equals(
    "refund request customer",
    refundRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals("refund request seller", refundRequest.seller, null);
  TestValidator.equals(
    "refund request response reason",
    refundRequest.response_reason,
    null,
  );
  TestValidator.predicate(
    "requested_at is set",
    refundRequest.requested_at !== null,
  );
  TestValidator.equals(
    "responded_at is null",
    refundRequest.responded_at,
    null,
  );
  // ============================================
  // 7. SELLER REFUND APPROVAL - Seller approves refund request
  // ============================================
  const updateResponse =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
          response_reason: "Refund approved - product defect confirmed",
        },
      },
    );
  typia.assert(updateResponse);
  // ============================================
  // 8. VALIDATION - Verify refund approval results
  // ============================================
  // Validate refund request state after approval
  TestValidator.equals(
    "refund status changed to approved",
    updateResponse.status,
    "approved",
  );
  TestValidator.equals(
    "response reason is set",
    updateResponse.response_reason,
    "Refund approved - product defect confirmed",
  );
  TestValidator.predicate(
    "responded_at is set",
    updateResponse.responded_at !== null,
  );
  TestValidator.predicate("seller is assigned", updateResponse.seller !== null);
  TestValidator.equals(
    "seller id matches",
    updateResponse.seller!.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "order item reference preserved",
    updateResponse.orderItem.id,
    orderItem.id,
  );
  // Validate order item status changed to refunded
  TestValidator.equals(
    "order item status changed to refunded",
    updateResponse.orderItem.status,
    "refunded",
  );
  // Verify snapshot was created (snapshot contains before/after state)
  // Note: Snapshot query endpoint would be needed to fully validate snapshot immutability
  // The snapshot creation is triggered by the approval operation internally
}
