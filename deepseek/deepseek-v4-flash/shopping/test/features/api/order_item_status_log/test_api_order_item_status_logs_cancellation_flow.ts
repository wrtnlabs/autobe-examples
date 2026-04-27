import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrderItemStatusLog";
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
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_cancellation_requests_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_order_item_status_logs_cancellation_flow(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // 1. Seller setup: join, create product + variant
  // ============================================
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: null,
      } satisfies DeepPartial<IECommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // ============================================
  // 2. Customer setup: join, create address, add to cart, place order
  // ============================================
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 2,
        } satisfies DeepPartial<IECommerceMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      } satisfies DeepPartial<IECommerceMallOrder.ICreate>,
    },
  );
  typia.assert(order);
  const orderItem = order.orderItems[0]!;
  typia.assert(orderItem);
  // ============================================
  // 3. Customer submits cancellation request
  // ============================================
  const cancellationRequest =
    await generate_random_e_commerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: "Changed my mind",
        } satisfies DeepPartial<IECommerceMallCancellationRequest.ICreate>,
      },
    );
  typia.assert(cancellationRequest);
  // ============================================
  // 4. Seller approves the cancellation request
  // ============================================
  const updatedCancellation =
    await api.functional.eCommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedCancellation);
  // ============================================
  // 5. Seller retrieves status logs
  // ============================================
  const statusLogsResponse =
    await api.functional.eCommerceMall.seller.orderItems.statusLogs.index(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {} satisfies IECommerceMallOrderItemStatusLog.IRequest,
      },
    );
  typia.assert(statusLogsResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    statusLogsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    statusLogsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records",
    statusLogsResponse.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages",
    statusLogsResponse.pagination.pages,
    1,
  );
  // Exactly 2 status log entries (initial paid + cancelled)
  TestValidator.equals("status log count", statusLogsResponse.data.length, 2);
  const logs = statusLogsResponse.data;
  // Logs are ordered by created_at descending (newest first)
  const entry1 = logs[0]!;
  const entry2 = logs[1]!;
  // Entry 1 (newest): to_status='cancelled', from_status='paid', reason='cancellation_approved'
  TestValidator.equals("entry 1 to_status", entry1.to_status, "cancelled");
  TestValidator.equals("entry 1 from_status", entry1.from_status, "paid");
  TestValidator.equals(
    "entry 1 reason",
    entry1.reason,
    "cancellation_approved",
  );
  // Entry 2 (oldest): to_status='paid', from_status=null, reason=null
  TestValidator.equals("entry 2 to_status", entry2.to_status, "paid");
  TestValidator.equals("entry 2 from_status", entry2.from_status, null);
  TestValidator.equals("entry 2 reason", entry2.reason, null);
  // Entry 1's created_at is later than entry 2's
  TestValidator.predicate(
    "cancelled entry timestamp is later than paid entry timestamp",
    new Date(entry1.created_at).getTime() >
      new Date(entry2.created_at).getTime(),
  );
  // Filter by to_status='cancelled' returns the cancellation entry only
  const cancelledLogsResponse =
    await api.functional.eCommerceMall.seller.orderItems.statusLogs.index(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {
          to_status: "cancelled",
        } satisfies IECommerceMallOrderItemStatusLog.IRequest,
      },
    );
  typia.assert(cancelledLogsResponse);
  TestValidator.equals(
    "filtered cancelled count",
    cancelledLogsResponse.data.length,
    1,
  );
  TestValidator.equals(
    "filtered cancelled to_status",
    cancelledLogsResponse.data[0]!.to_status,
    "cancelled",
  );
  // Filter by to_status='shipped' returns empty array
  const shippedLogsResponse =
    await api.functional.eCommerceMall.seller.orderItems.statusLogs.index(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {
          to_status: "shipped",
        } satisfies IECommerceMallOrderItemStatusLog.IRequest,
      },
    );
  typia.assert(shippedLogsResponse);
  TestValidator.equals(
    "filtered shipped count",
    shippedLogsResponse.data.length,
    0,
  );
}
