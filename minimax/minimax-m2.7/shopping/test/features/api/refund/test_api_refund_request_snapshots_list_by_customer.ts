import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create";
import { generate_random_ecommerce_mall_customer_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_me_cart_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_refund_request_snapshots_list_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Seller joins (using join utility - assumes auto-approval or test environment)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create product with variant using generation function
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Get the first variant
  const variant = product.variants[0];
  typia.assert(variant);
  // 4. Add inventory to the variant
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Customer adds product to cart
  const cart = await generate_random_ecommerce_mall_customer_me_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  typia.assert(cart);
  // 6. Customer places order
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: customerAuth.shippingAddresses[0].id,
        },
      },
    );
  typia.assert(order);
  // Get order item ID
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 7. Seller creates shipment
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerConnection,
      {
        params: { itemId: orderItem.id },
        body: {
          itemIds: [orderItem.id],
          carrier: "TestCarrier",
          trackingNumber: "TRACK123456",
        },
      },
    );
  typia.assert(shipment);
  // 8. Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 9. Customer creates refund request
  const refundReason = "Product received was damaged";
  const refundRequest =
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
        body: {
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 10. Seller approves refund (creates snapshot)
  const approvedRefund =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.approve(
      sellerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefund);
  // 11. Customer retrieves refund request snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        requestId: refundRequest.id,
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 12. Validate response structure
  TestValidator.equals(
    "has pagination",
    snapshotsResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(snapshotsResponse.data),
  );
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotsResponse.data.length > 0,
  );
  // 13. Validate snapshot fields
  const snapshot = snapshotsResponse.data[0];
  TestValidator.equals(
    "snapshotReason matches original customer reason",
    snapshot.snapshotReason,
    refundReason,
  );
  TestValidator.equals(
    "snapshotStatus is approved",
    snapshot.snapshotStatus,
    "approved",
  );
  TestValidator.equals(
    "sellerResponse is approved",
    snapshot.sellerResponse,
    "approved",
  );
  TestValidator.equals(
    "sellerResponseReason is null for approved",
    snapshot.sellerResponseReason,
    null,
  );
  // 14. Validate customer info exists in snapshot
  TestValidator.predicate("has customer info", snapshot.customer !== undefined);
  TestValidator.equals(
    "customer id matches",
    snapshot.customer.id,
    customerAuth.id,
  );
  // 15. Validate seller info exists in snapshot
  TestValidator.predicate("has seller info", snapshot.seller !== undefined);
  // 16. Validate snapshots are ordered by created_at descending
  for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
    const current = new Date(snapshotsResponse.data[i].createdAt).getTime();
    const next = new Date(snapshotsResponse.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `snapshot ${i} created_at >= snapshot ${i + 1} created_at`,
      current >= next,
    );
  }
}
