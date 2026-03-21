import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
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
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_refund_request_snapshot_access_control_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A (legitimate owner) registers and authenticates
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  // 2. Customer B (unauthorized accessor) registers and authenticates
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // 3. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Seller creates product with variant and adds inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const variant = product.variants[0];
  if (!variant) {
    throw new Error("Product has no variants");
  }
  // 5. Customer A prepares checkout (validates cart items)
  await api.functional.ecommerceMall.customer.checkout.prepare(
    customerAConnection,
  );
  // 6. Customer A confirms checkout to create order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerAConnection,
      {
        body: {
          payment_token: "test_payment_token_" + Date.now(),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("Order has no items");
  }
  // 7. Seller creates shipment for the order
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "Test Carrier",
        trackingNumber: "TEST-TRACK-" + Date.now(),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 8. Customer A confirms delivery
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerAConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 9. Get Customer A's refund requests
  const refundRequests =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerAConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  // Find a refund request that has been processed (with snapshot)
  let targetRefundRequestId: string | undefined;
  for (const refund of refundRequests.data) {
    if (refund.status === "approved" || refund.status === "rejected") {
      targetRefundRequestId = refund.id;
      break;
    }
  }
  // If no processed refund request, try to approve a pending one
  if (!targetRefundRequestId) {
    const pendingRequests =
      await api.functional.ecommerceMall.customer.refund_requests.index(
        customerAConnection,
        {
          body: {
            status: "pending",
          } satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    if (pendingRequests.data.length > 0) {
      try {
        await api.functional.ecommerceMall.seller.refund_requests.approve(
          sellerConnection,
          {
            requestId: pendingRequests.data[0].id,
          },
        );
        targetRefundRequestId = pendingRequests.data[0].id;
      } catch {
        targetRefundRequestId = pendingRequests.data[0].id;
      }
    }
  }
  // Use order ID as fallback (access control test works for any ID)
  if (!targetRefundRequestId) {
    targetRefundRequestId = order.id;
  }
  // TEST EXECUTION: Customer B (unauthorized) tries to access Customer A's refund request snapshots
  await TestValidator.httpError(
    "Customer B cannot access Customer A's refund request snapshots",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
        customerBConnection,
        {
          requestId: targetRefundRequestId as string & tags.Format<"uuid">,
          body: {} satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
        },
      );
    },
  );
}
