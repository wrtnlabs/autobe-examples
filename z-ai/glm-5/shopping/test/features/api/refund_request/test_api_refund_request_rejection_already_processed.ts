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
 * Test business rule validation: Attempt to reject a refund request that is already processed.
 * This test validates that only refund requests in 'pending' status can be rejected.
 * Approved or rejected requests are in terminal status and cannot be modified.
 */
export async function test_api_refund_request_rejection_already_processed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - register and get approved (simulated by join)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates product and variant
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      { body: { categoryId: category.id } },
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Customer setup - register and create address
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 5. Customer adds to cart and completes checkout
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      { body: { variantId: variant.id, quantity: 1 } },
    );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_customer_checkout_complete(
    customerConnection,
    { body: { addressId: address.id } },
  );
  typia.assert(order);
  // 6. Seller creates shipment
  const orderItem = order.orderItems[0];
  typia.assertGuard(orderItem);
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderId: order.id,
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // 7. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(confirmedShipment);
  // 8. Customer creates refund request
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "initial status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "responded_at is null initially",
    refundRequest.responded_at,
    null,
  );
  // 9. Seller approves the refund request
  const approvedRequest =
    await api.functional.shoppingMall.seller.refund_requests.approve(
      sellerConnection,
      { refundRequestId: refundRequest.id },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at is set",
    approvedRequest.responded_at !== null,
  );
  // Store the original responded_at timestamp
  const originalRespondedAt = approvedRequest.responded_at;
  // TEST 1: Attempt to reject an already-approved refund request
  await TestValidator.httpError(
    "cannot reject approved refund request",
    400,
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.reject(
        sellerConnection,
        { refundRequestId: refundRequest.id },
      );
    },
  );
  // Verify status remains approved
  TestValidator.equals(
    "status remains approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "responded_at unchanged",
    approvedRequest.responded_at,
    originalRespondedAt,
  );
  // TEST 2: Create another refund request scenario for rejected status
  // Create a new order for testing rejection of already-rejected request
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      { body: { variantId: variant.id, quantity: 1 } },
    );
  typia.assert(cartItem2);
  const order2 = await generate_random_shopping_mall_customer_checkout_complete(
    customerConnection,
    { body: { addressId: address.id } },
  );
  typia.assert(order2);
  const orderItem2 = order2.orderItems[0];
  typia.assertGuard(orderItem2);
  const shipment2 =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderId: order2.id,
          orderItemIds: [orderItem2.id],
        },
      },
    );
  typia.assert(shipment2);
  const confirmedShipment2 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment2.id },
    );
  typia.assert(confirmedShipment2);
  const refundRequest2 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem2.id,
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(refundRequest2);
  // Seller rejects the refund request
  const rejectedRequest =
    await api.functional.shoppingMall.seller.refund_requests.reject(
      sellerConnection,
      { refundRequestId: refundRequest2.id },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  // TEST 3: Attempt to reject an already-rejected refund request
  await TestValidator.httpError(
    "cannot re-reject rejected refund request",
    400,
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.reject(
        sellerConnection,
        { refundRequestId: refundRequest2.id },
      );
    },
  );
  TestValidator.equals(
    "status remains rejected",
    rejectedRequest.status,
    "rejected",
  );
}
