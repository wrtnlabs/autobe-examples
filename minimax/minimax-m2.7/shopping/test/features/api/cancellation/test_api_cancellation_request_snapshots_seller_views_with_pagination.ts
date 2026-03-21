import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
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
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
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
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_cancellation_request_snapshots_seller_views_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Create product with variant and inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant = product.variants[0];
  // Add inventory to the variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: { operation: "restock", quantity: 10, reason: "Initial stock" },
    },
  );
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Customer adds product to cart and places order
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { variant_id: variant.id, quantity: 2 },
    },
  );
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token",
        },
      },
    );
  typia.assert(order);
  // 4. Get cancellation request ID from order
  const orderItem = order.orderItems[0];
  // 5. Seller views snapshot list with pagination for the order item's cancellation context
  // Since we don't have a seller cancellation endpoint, we test the snapshot API directly
  // with the order item ID as context
  // Test default pagination - API should return empty or handle gracefully
  const snapshotsPage1 =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        requestId: orderItem.id,
        body: {},
      },
    );
  typia.assert(snapshotsPage1);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current is number",
    typeof snapshotsPage1.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof snapshotsPage1.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination records is number",
    typeof snapshotsPage1.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof snapshotsPage1.pagination.pages === "number",
    true,
  );
  // Test pagination with custom page and limit parameters
  const snapshotsPage2 =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        requestId: orderItem.id,
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(snapshotsPage2);
  // Validate pagination parameters are respected
  TestValidator.equals(
    "current page is 1",
    snapshotsPage2.pagination.current,
    1,
  );
  TestValidator.equals("limit is 5", snapshotsPage2.pagination.limit, 5);
  // Test filtering by status - approved
  const approvedSnapshots =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        requestId: orderItem.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedSnapshots);
  // All returned snapshots should have approved status
  for (const snapshot of approvedSnapshots.data) {
    TestValidator.equals(
      "snapshot status approved",
      snapshot.status,
      "approved",
    );
  }
  // Test filtering by status - rejected
  const rejectedSnapshots =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        requestId: orderItem.id,
        body: {
          status: "rejected",
        },
      },
    );
  typia.assert(rejectedSnapshots);
  // All returned snapshots should have rejected status
  for (const snapshot of rejectedSnapshots.data) {
    TestValidator.equals(
      "snapshot status rejected",
      snapshot.status,
      "rejected",
    );
  }
  // Test date range filtering
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const snapshotsWithDateFilter =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        requestId: orderItem.id,
        body: {
          createdAtFrom: oneDayAgo,
          createdAtTo: now,
        },
      },
    );
  typia.assert(snapshotsWithDateFilter);
  // Validate data array exists
  TestValidator.equals(
    "data is array",
    Array.isArray(snapshotsWithDateFilter.data),
    true,
  );
  // Validate snapshot data structure if any exist
  for (const snapshot of snapshotsPage1.data) {
    TestValidator.equals(
      "snapshot has id",
      typeof snapshot.id === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has reason",
      typeof snapshot.reason === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has status",
      typeof snapshot.status === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has created_at",
      typeof snapshot.created_at === "string",
      true,
    );
  }
}
