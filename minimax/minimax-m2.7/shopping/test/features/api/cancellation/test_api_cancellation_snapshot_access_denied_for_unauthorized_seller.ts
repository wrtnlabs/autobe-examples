import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
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
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that an unauthorized seller cannot access another seller's cancellation request snapshot.
 *
 * Scenario:
 * 1. Seller A registers and creates a product with inventory
 * 2. Customer registers, purchases the product, and checkout
 * 3. Seller A ships the order
 * 4. Customer confirms delivery
 * 5. Customer requests cancellation
 * 6. Seller A approves cancellation (creates snapshot)
 * 7. Seller B (unrelated) authenticates
 * 8. Seller B attempts to access Seller A's cancellation snapshot
 * 9. System rejects with 403 Forbidden - sellers can only access snapshots for cancellation requests they own
 */
export async function test_api_cancellation_snapshot_access_denied_for_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // === Step 1: Seller A joins and creates product ===
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerAConnection,
      {},
    );
  // Add inventory to Seller A's product
  const variantId = sellerAProduct.variants[0]!.id;
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerAConnection,
    { params: { productId: sellerAProduct.id, variantId } },
  );
  // === Step 2: Customer joins and adds item to cart ===
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { variant_id: variantId, quantity: 1 },
    },
  );
  // === Step 3: Customer prepares and confirms checkout ===
  await api.functional.ecommerceMall.customer.checkout.prepare(
    customerConnection,
  );
  const checkoutConfirm =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "PAYMENT_TOKEN_SIMULATION_SUCCESS",
        },
      },
    );
  typia.assert(checkoutConfirm);
  const orderItemId = checkoutConfirm.orderItems[0]!.id;
  const orderId = checkoutConfirm.id;
  // === Step 4: Seller A ships the order ===
  await generate_random_ecommerce_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        orderId: orderId,
        orderItemIds: [orderItemId],
        carrier: "FastShip",
        trackingNumber: "TRACK123456",
      },
    },
  );
  // === Step 5: Customer confirms delivery ===
  const shipmentId = checkoutConfirm.shipments[0]!.id;
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: orderId,
      shipmentId: shipmentId,
    },
  );
  // === Step 6: Customer requests cancellation ===
  await api.functional.ecommerceMall.customer.cancellation_requests.index(
    customerConnection,
    {
      body: {
        status: "pending",
      },
    },
  );
  // === Step 7: Seller A approves cancellation (creates snapshot) ===
  const cancellationList =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {},
      },
    );
  const cancellationRequest = cancellationList.data[0]!;
  const approvedCancellation =
    await api.functional.ecommerceMall.seller.cancellation_requests.approve(
      sellerAConnection,
      {
        requestId: cancellationRequest.id,
      },
    );
  typia.assert(approvedCancellation);
  // Get the snapshot ID from the approved cancellation
  const snapshotId = approvedCancellation.snapshots[0]!.id;
  const requestId = approvedCancellation.id;
  // === Step 8: Seller B joins and authenticates ===
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // === Step 9: Seller B attempts to access Seller A's cancellation snapshot ===
  // This should be rejected with 403 Forbidden
  await TestValidator.httpError(
    "unauthorized seller cannot access another seller's cancellation snapshot",
    403,
    async () =>
      await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.at(
        sellerBConnection,
        {
          requestId: requestId,
          snapshotId: snapshotId,
        },
      ),
  );
}
