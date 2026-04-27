import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallRefundRequestSnapshot";
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
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_refund_requests_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_customer_refund_request_snapshots_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // Create separate connections for each actor
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Customer joins
  await authorize_customer_join(customerConnection, {});
  // 2. Seller joins
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product (no category needed)
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    { body: { category_id: null } },
  );
  typia.assert(product);
  // 4. Seller creates a variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 5. Seller restocks inventory
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: { quantity_change: 100, reason: "restock for test" },
    },
  );
  // 6. Customer creates an address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 7. Customer adds variant to cart
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      },
    },
  );
  // 8. Customer places an order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    { body: { addressId: address.id } },
  );
  typia.assert(order);
  const orderItemId = order.orderItems[0].id;
  // 9. Seller creates a shipment
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      { body: { orderItemIds: [orderItemId] } },
    );
  typia.assert(shipment);
  // 10. Customer confirms delivery
  await api.functional.eCommerceMall.customer.shipments.update(
    customerConnection,
    { shipmentId: shipment.id, body: {} },
  );
  // 11. Customer creates a refund request
  const refundRequest =
    await generate_random_e_commerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: "Changed my mind about this product",
        },
      },
    );
  typia.assert(refundRequest);
  // 12. Seller rejects the refund request — creates a snapshot with status='rejected'
  const beforeRejection = new Date();
  await api.functional.eCommerceMall.seller.refund_requests.update(
    sellerConnection,
    {
      refundRequestId: refundRequest.id,
      body: { status: "rejected" },
    },
  );
  const afterRejection = new Date();
  // 13. Sub-test A: Filter snapshots by status='rejected'
  const rejectedSnapshots =
    await api.functional.eCommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(rejectedSnapshots);
  TestValidator.equals(
    "rejected snapshots count",
    rejectedSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "snapshot status",
    rejectedSnapshots.data[0].status,
    "rejected",
  );
  TestValidator.equals(
    "snapshot reason",
    rejectedSnapshots.data[0].reason,
    "Changed my mind about this product",
  );
  // 14. Sub-test B: Filter by date range covering the rejection time
  const snapshotsInRange =
    await api.functional.eCommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          response_timestamp_from: beforeRejection.toISOString(),
          response_timestamp_to: afterRejection.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsInRange);
  TestValidator.equals(
    "snapshots in date range count",
    snapshotsInRange.data.length,
    1,
  );
  // 15. Sub-test B2: Non-overlapping date range (future dates) — expect zero records
  const futureFrom = new Date(afterRejection.getTime() + 86400000); // 1 day later
  const futureTo = new Date(futureFrom.getTime() + 86400000); // 2 days later
  const futureSnapshots =
    await api.functional.eCommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          response_timestamp_from: futureFrom.toISOString(),
          response_timestamp_to: futureTo.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(futureSnapshots);
  TestValidator.equals(
    "future snapshots count",
    futureSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "future pagination records",
    futureSnapshots.pagination.records,
    0,
  );
}
