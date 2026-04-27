import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
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
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test that an administrator can view the complete status change history for a cancelled order item.
 *
 * Validates the full cancellation audit trail by creating a product, placing an order, requesting cancellation, and having the seller approve it — generating two status log entries. The administrator then queries the status logs endpoint and verifies correct pagination, status transitions, reasons, and timestamps.
 *
 * 1. Create administrator, seller, and customer accounts.
 * 2. Seller creates a product with a variant and adds inventory stock.
 * 3. Customer creates a shipping address, adds the variant to cart, and places an order — generates the first status log (from_status: null, to_status: 'paid').
 * 4. Customer submits a cancellation request for the order item.
 * 5. Seller approves the cancellation — generates the second status log (from_status: 'paid', to_status: 'cancelled', reason: 'cancellation_approved').
 * 6. Administrator calls the status logs endpoint with no filters.
 * 7. Validates pagination metadata, status transitions, orderItem references, reason values, and timestamp ordering.
 */
export async function test_api_administrator_order_item_status_log_cancellation_audit(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections (NEVER use base connection directly)
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate all actors
  // Administrator join
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // Seller join
  await authorize_seller_join(sellerConnection, {});
  // Customer join
  await authorize_customer_join(customerConnection, {});
  // 2. Seller creates a product
  const product: IECommerceMallProduct =
    await generate_random_e_commerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Seller creates a variant
  const variant: IECommerceMallProductVariant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Seller adds inventory (restock 100 units to ensure sufficient stock)
  const inventoryRecord: IECommerceMallInventoryRecord =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "initial stock",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Customer creates a shipping address
  const address: IECommerceMallCustomerAddress =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 6. Customer adds the variant to cart
  const cartItem: IECommerceMallCartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer places the order (creates first status log: null -> 'paid')
  const order: IECommerceMallOrder =
    await generate_random_e_commerce_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          addressId: address.id,
        },
      },
    );
  typia.assert(order);
  const orderItem: IECommerceMallOrderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 8. Customer submits a cancellation request
  const cancellationRequest: IECommerceMallCancellationRequest =
    await generate_random_e_commerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: "Changed my mind",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 9. Seller approves the cancellation request (creates second status log: 'paid' -> 'cancelled')
  const approvedCancellation: IECommerceMallCancellationRequest =
    await api.functional.eCommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedCancellation);
  // 10. Administrator queries status logs for the order item
  const statusLogsPage: IPageIECommerceMallOrderItemStatusLog.ISummary =
    await api.functional.eCommerceMall.administrator.orderItems.statusLogs.index(
      adminConnection,
      {
        itemId: orderItem.id,
        body: {} satisfies IECommerceMallOrderItemStatusLog.IRequest,
      },
    );
  typia.assert(statusLogsPage);
  // 11. Validate pagination metadata
  const { data, pagination } = statusLogsPage;
  TestValidator.equals("records count", pagination.records, 2);
  TestValidator.equals("pages count", pagination.pages, 1);
  TestValidator.equals("current page", pagination.current, 1);
  // 12. Validate first (newest) log: paid -> cancelled, reason = cancellation_approved
  const firstLog: IECommerceMallOrderItemStatusLog.ISummary = data[0];
  TestValidator.equals("first log from_status", firstLog.from_status, "paid");
  TestValidator.equals("first log to_status", firstLog.to_status, "cancelled");
  TestValidator.equals(
    "first log reason",
    firstLog.reason,
    "cancellation_approved",
  );
  TestValidator.equals(
    "first log orderItem.id",
    firstLog.orderItem.id,
    orderItem.id,
  );
  // 13. Validate second log: null -> paid
  const secondLog: IECommerceMallOrderItemStatusLog.ISummary = data[1];
  TestValidator.equals("second log from_status", secondLog.from_status, null);
  TestValidator.equals("second log to_status", secondLog.to_status, "paid");
  TestValidator.equals(
    "second log orderItem.id",
    secondLog.orderItem.id,
    orderItem.id,
  );
  // 14. Validate timestamps are valid ISO 8601 date-time strings
  TestValidator.predicate("first log timestamp is valid", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstLog.created_at),
  );
  TestValidator.predicate("second log timestamp is valid", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(secondLog.created_at),
  );
  // 15. Validate timestamp ordering (newest first)
  TestValidator.predicate(
    "timestamps ordered newest first",
    () =>
      new Date(firstLog.created_at).getTime() >=
      new Date(secondLog.created_at).getTime(),
  );
}
