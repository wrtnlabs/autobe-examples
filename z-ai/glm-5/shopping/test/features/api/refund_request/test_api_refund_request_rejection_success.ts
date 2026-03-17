import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_complete } from "../../../generate/generate_random_shopping_mall_customer_checkout_complete";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test the primary success path for seller rejecting a pending refund request.
 *
 * Prerequisites Setup:
 * 1. Administrator creates a category for products
 * 2. Seller registers and gets approved (seller must own product)
 * 3. Seller creates a product in the category
 * 4. Seller adds a product variant (SKU) with stock
 * 5. Customer registers and creates a shipping address
 * 6. Customer adds the product variant to cart
 * 7. Customer completes checkout creating an order
 * 8. Seller creates a shipment for the order
 * 9. Customer confirms delivery
 * 10. Customer creates a refund request for the delivered item
 *
 * Test Execution:
 * 1. Seller calls PATCH /seller/refund-requests/{refundRequestId}/reject
 * 2. Validate status changed from 'pending' to 'rejected'
 * 3. Validate responded_at timestamp is set
 * 4. Validate orderItem relationship is populated
 * 5. Validate reason text is preserved
 */
export async function test_api_refund_request_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: undefined });
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      { body: undefined },
    );
  typia.assert(category);
  // Step 2: Seller setup - register and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: undefined });
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      { body: { categoryId: category.id } },
    );
  typia.assert(product);
  // Step 3: Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: undefined,
      },
    );
  typia.assert(variant);
  // Step 4: Customer setup - register and create address
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: undefined });
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    { body: undefined },
  );
  typia.assert(address);
  // Step 5: Customer adds item to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      { body: { variantId: variant.id, quantity: 1 } },
    );
  typia.assert(cartItem);
  // Step 6: Customer completes checkout
  const order = await generate_random_shopping_mall_customer_checkout_complete(
    customerConnection,
    { body: { addressId: address.id } },
  );
  typia.assert(order);
  // Get order item for shipment
  const orderItem = order.orderItems[0];
  // Step 7: Seller creates shipment
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderId: order.id,
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // Step 8: Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(confirmedShipment);
  // Step 9: Customer creates refund request
  const refundReason = RandomGenerator.paragraph({ sentences: 5 });
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      { body: { orderItemId: orderItem.id, reason: refundReason } },
    );
  typia.assert(refundRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "initial refund request status",
    refundRequest.status,
    "pending",
  );
  // Step 10: Seller rejects the refund request
  const rejectedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.reject(
      sellerConnection,
      { refundRequestId: refundRequest.id },
    );
  typia.assert(rejectedRefundRequest);
  // Step 11: Validate rejection response
  TestValidator.equals(
    "refund request status after rejection",
    rejectedRefundRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "responded_at is set",
    rejectedRefundRequest.responded_at !== null,
  );
  TestValidator.equals(
    "reason is preserved",
    rejectedRefundRequest.reason,
    refundReason,
  );
  TestValidator.equals(
    "orderItem relationship populated",
    rejectedRefundRequest.orderItem.id,
    orderItem.id,
  );
}
