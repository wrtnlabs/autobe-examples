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
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_order_item_status_log_cancellation_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account and connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthd = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuthd);
  // Step 2: Create seller account and connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthd = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthd);
  // Step 3: Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 4: Seller creates a variant under the product
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // Step 5: Seller restocks the variant with positive inventory
  const inventoryRecord =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: { quantity_change: 100 },
      },
    );
  typia.assert(inventoryRecord);
  // Step 6: Customer creates a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // Step 7: Customer adds the variant to cart
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // Step 8: Customer places the order — order item created with status 'paid'
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // Get the order item
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // Step 9: Customer submits a cancellation request for the paid order item
  const cancellationRequest =
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
  // Step 10: Seller approves the cancellation request
  // This transitions item from 'paid' to 'cancelled' with reason='cancellation_approved'
  const updatedCancellationRequest =
    await api.functional.eCommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved" as const,
        },
      },
    );
  typia.assert(updatedCancellationRequest);
  // Step 11: Call the target endpoint — PATCH statusLogs with no filters
  const fullPage =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: orderItem.id,
        body: {},
      },
    );
  typia.assert(fullPage);
  // Verify 2 entries: (null→paid) and (paid→cancelled)
  TestValidator.equals("status log count", fullPage.data.length, 2);
  // Entries are ordered by created_at DESC (newest first)
  const entry1 = fullPage.data[0]!; // newest: paid→cancelled
  const entry2 = fullPage.data[1]!; // oldest: null→paid
  // Entry 1: paid → cancelled, reason='cancellation_approved'
  TestValidator.equals("entry 1 from_status", entry1.from_status, "paid");
  TestValidator.equals("entry 1 to_status", entry1.to_status, "cancelled");
  TestValidator.equals(
    "entry 1 reason",
    entry1.reason,
    "cancellation_approved",
  );
  // Entry 2: null → paid, reason=null
  TestValidator.equals("entry 2 from_status", entry2.from_status, null);
  TestValidator.equals("entry 2 to_status", entry2.to_status, "paid");
  TestValidator.equals("entry 2 reason", entry2.reason, null);
  // Verify each entry has valid id, orderItem reference, timestamps
  TestValidator.predicate(
    "entry 1 has valid id",
    () => entry1.id !== undefined,
  );
  TestValidator.predicate(
    "entry 2 has valid id",
    () => entry2.id !== undefined,
  );
  TestValidator.predicate(
    "entry 1 has correct orderItem ref",
    () => entry1.orderItem.id === orderItem.id,
  );
  TestValidator.predicate(
    "entry 2 has correct orderItem ref",
    () => entry2.orderItem.id === orderItem.id,
  );
  TestValidator.predicate(
    "entry 1 has created_at",
    () => entry1.created_at !== undefined,
  );
  TestValidator.predicate(
    "entry 2 has created_at",
    () => entry2.created_at !== undefined,
  );
  // Step 12: Filter by to_status='cancelled'
  const cancelledPage =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: orderItem.id,
        body: { to_status: "cancelled" },
      },
    );
  typia.assert(cancelledPage);
  TestValidator.equals("cancelled filter count", cancelledPage.data.length, 1);
  TestValidator.equals(
    "cancelled filter to_status",
    cancelledPage.data[0]!.to_status,
    "cancelled",
  );
  // Step 13: Filter by reason with LIKE match 'cancellation'
  const reasonPage =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: orderItem.id,
        body: { reason: "cancellation" },
      },
    );
  typia.assert(reasonPage);
  TestValidator.equals("reason filter count", reasonPage.data.length, 1);
  TestValidator.equals(
    "reason filter value",
    reasonPage.data[0]!.reason,
    "cancellation_approved",
  );
  // Step 14: Filter by from_status='paid' — only the cancelled entry matches (entry2 has null from_status)
  const fromPaidPage =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: orderItem.id,
        body: { from_status: "paid" },
      },
    );
  typia.assert(fromPaidPage);
  TestValidator.equals(
    "from_status paid filter count",
    fromPaidPage.data.length,
    1,
  );
  TestValidator.equals(
    "from_status paid filter value",
    fromPaidPage.data[0]!.from_status,
    "paid",
  );
  TestValidator.equals(
    "from_status paid filter to_status",
    fromPaidPage.data[0]!.to_status,
    "cancelled",
  );
  // Step 15: Test pagination (page=1, limit=1) — 1 entry returned, records=2, pages=2
  const paginatedPage =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: orderItem.id,
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(paginatedPage);
  TestValidator.equals("pagination data count", paginatedPage.data.length, 1);
  TestValidator.equals(
    "pagination records",
    paginatedPage.pagination.records,
    2,
  );
  TestValidator.equals("pagination pages", paginatedPage.pagination.pages, 2);
  // Step 16: Test date range filtering — set created_at_from before order creation time
  const dateRangePage =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: orderItem.id,
        body: { created_at_from: "2000-01-01T00:00:00.000Z" },
      },
    );
  typia.assert(dateRangePage);
  TestValidator.equals("date range filter count", dateRangePage.data.length, 2);
  // Step 17: Test 404 with non-existent itemId
  await TestValidator.httpError("404 on non-existent itemId", 404, async () => {
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      },
    );
  });
}
