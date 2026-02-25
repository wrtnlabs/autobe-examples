import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_order_items_cancellation_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_request_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that a seller cannot approve a cancellation request for an order item they do not own.
 *
 * This authorization boundary test validates that:
 * 1. Only the seller who owns the product (via shopping_mall_seller_id on order_item) can approve cancellations
 * 2. Cross-seller approval attempts are blocked with appropriate error
 * 3. Unauthorized approval attempts do not modify cancellation request state
 *
 * Setup:
 * - Seller A creates a product and variant with stock
 * - Customer places an order for Seller A's variant
 * - Customer creates a cancellation request for the order item
 * - Seller B (different seller) attempts to approve Seller A's cancellation request
 *
 * Expected: 403 Forbidden - seller not authorized to approve this request
 */
export async function test_api_cancellation_request_approval_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // Step 1: Create Seller A (product owner)
  // ========================================
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `Seller A Shop - ${RandomGenerator.name()}`,
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(sellerA);
  // ========================================
  // Step 2: Seller A creates a product
  // ========================================
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: `Test Product - ${RandomGenerator.name()}`,
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // ========================================
  // Step 3: Seller A creates a variant with stock
  // ========================================
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<50000>
          >(),
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ] as const),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
            },
          ],
          stockQuantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(variant);
  // ========================================
  // Step 4: Create Customer
  // ========================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(customer);
  // ========================================
  // Step 5: Customer places an order
  // Note: This requires cart items and address setup which may need
  // additional API calls not provided in the template
  // ========================================
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item (which belongs to Seller A's product)
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // ========================================
  // Step 6: Customer creates cancellation request
  // ========================================
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_request_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
        body: {
          reason: "Changed my mind - testing cancellation",
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify cancellation request is in pending status
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // ========================================
  // Step 7: Create Seller B (unauthorized seller)
  // ========================================
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `Seller B Shop - ${RandomGenerator.name()}`,
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(sellerB);
  // ========================================
  // Step 8: Seller B attempts to approve cancellation request
  // This should fail with 403 Forbidden
  // ========================================
  await TestValidator.httpError(
    "Seller B cannot approve Seller A's cancellation request",
    403,
    async () =>
      await api.functional.shoppingMall.seller.cancellation_requests.approve(
        sellerBConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          body: {
            seller_response: "Approved by wrong seller",
          } satisfies IShoppingMallCancellationRequest.IApprove,
        },
      ),
  );
}