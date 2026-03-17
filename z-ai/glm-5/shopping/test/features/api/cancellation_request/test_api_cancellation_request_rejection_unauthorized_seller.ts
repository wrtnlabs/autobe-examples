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
 * Test that a seller cannot reject a cancellation request for a product they do not own.
 * This validates the seller ownership authorization rule.
 *
 * Note: This test requires the following prerequisites to be created separately:
 * - Product created by Seller A (product creation API not in provided dependencies)
 * - Customer address (address creation API not in provided dependencies)
 *
 * If these APIs exist elsewhere in the codebase, this test will function correctly.
 */
export async function test_api_cancellation_request_rejection_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Seller A (product owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  // Step 2: Create Customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Step 3: Seller A creates product variant and adds inventory
  // Generate a UUID for productId (assumes product already exists or will be created)
  // Note: Product creation API not provided - productId must reference existing product
  const productId = typia.random<string & typia.tags.Format<"uuid">>();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId },
      },
    );
  typia.assert(variant);
  const inventory =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerAConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial inventory for test",
        },
      },
    );
  typia.assert(inventory);
  // Step 4: Customer adds item to cart and checks out
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
  // Generate addressId for checkout (assumes address already exists)
  // Note: Address creation API not provided - addressId must reference existing address
  const addressId = typia.random<string & typia.tags.Format<"uuid">>();
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: { addressId },
    },
  );
  typia.assert(order);
  // Get order item for cancellation request
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // Step 5: Customer creates cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
        body: {
          reason: "Customer requested cancellation",
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  // Step 6: Create Seller B (unauthorized seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  // Verify Seller B is different from Seller A
  TestValidator.notEquals("sellers are different", sellerA.id, sellerB.id);
  // Step 7: Seller B attempts to reject the cancellation request (should fail with 403)
  await TestValidator.httpError(
    "Seller B cannot reject Seller A's cancellation request",
    403,
    async () =>
      await api.functional.shoppingMall.seller.cancellation_requests.reject(
        sellerBConnection,
        { cancellationRequestId: cancellationRequest.id },
      ),
  );
  // Step 8: Verify cancellation request status remains unchanged (still pending)
  TestValidator.equals(
    "cancellation request status still pending",
    cancellationRequest.status,
    "pending",
  );
  // Verify no seller has responded yet
  TestValidator.equals(
    "no seller has responded",
    cancellationRequest.seller,
    null,
  );
}
