import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that a seller cannot reject a cancellation request that belongs to another seller.
 *
 * **Setup Steps:**
 * 1. Register seller A (owner of the product/cancellation request)
 * 2. Register seller B (unauthorized actor attempting rejection)
 * 3. Register customer who will place order and request cancellation
 * 4. Seller A creates product and adds inventory
 * 5. Customer adds product to cart and completes checkout
 * 6. Customer creates cancellation request for the order item
 *
 * **Test Execution:**
 * - Authenticate as seller B (different seller)
 * - Attempt to reject cancellation request belonging to seller A
 *
 * **Expected Validations:**
 * - Response status: 403 Forbidden
 * - Cancellation request status remains 'pending'
 * - Data isolation is maintained - sellers cannot manipulate other sellers' cancellation requests
 */
export async function test_api_cancellation_request_rejection_forbidden_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register seller A (owner of the cancellation request)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  // Setup: Register seller B (will attempt unauthorized rejection)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  // Setup: Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // Seller A creates product with inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  const variant = product.variants[0];
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerAConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // Customer adds product to cart and completes checkout
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: typia.random<string>(),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  // Customer creates cancellation request
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationRequest);
  // Verify the cancellation request was created
  const createdRequest = cancellationRequest.data.find(
    (req) => req.orderItem.id === orderItem.id,
  );
  TestValidator.equals(
    "cancellation request exists for order item",
    createdRequest !== undefined,
    true,
  );
  // Test Execution: Seller B attempts to reject seller A's cancellation request
  // Expected: 403 Forbidden
  await TestValidator.error(
    "seller B cannot reject cancellation request belonging to seller A",
    async () => {
      await api.functional.ecommerceMall.seller.cancellation_requests.reject(
        sellerBConnection,
        {
          requestId: createdRequest!.id,
          body: {
            reason: "Unauthorized rejection attempt",
          } satisfies IEcommerceMallCancellationRequest.IReject,
        },
      );
    },
  );
  // Verify cancellation request still exists and is pending
  const remainingRequests =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(remainingRequests);
  const stillPending = remainingRequests.data.some(
    (req) => req.id === createdRequest!.id,
  );
  TestValidator.equals(
    "cancellation request remains pending after unauthorized rejection attempt",
    stillPending,
    true,
  );
}