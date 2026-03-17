import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_cancellation_requests_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_cancellation_snapshot_list_filtered_by_status_rejected(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Admin setup ──────────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ── 2. Create product category ─────────────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphabets(8) } },
  );
  typia.assert(category);
  // ── 3. Seller joins ─────────────────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // ── 4. Seller submits approval request ──────────────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ── 5. Admin approves the seller ─────────────────────────────────────────────
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  // ── 6. Seller creates a product ─────────────────────────────────────────────
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // ── 7. Seller creates a product variant ─────────────────────────────────────
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: `SKU-${RandomGenerator.alphaNumeric(10)}`,
        },
      },
    );
  typia.assert(variant);
  // ── 8. Seller adds inventory ─────────────────────────────────────────────────
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: { quantity: 100, note: "Initial stock" },
      },
    );
  typia.assert(inventoryRecord);
  // ── 9. Customer joins ────────────────────────────────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // ── 10. Customer places an order ─────────────────────────────────────────────
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: "123 Test Street",
        shipping_city: "Seoul",
        shipping_postal_code: "12345",
        shipping_country: "KR",
        items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // Get the first order item
  const orderItem = order.items[0]!;
  // ── 11. Customer submits cancellation request with distinctive reason ────────
  const distinctiveKeyword = `DISTINCTIVE-CANCEL-${RandomGenerator.alphaNumeric(8)}`;
  const cancellationReason = `I want to cancel this order. ${distinctiveKeyword} is the unique identifier for this test.`;
  const cancellationRequest =
    await generate_random_shopping_mall_customer_orders_items_cancellation_requests_create(
      customerConnection,
      {
        params: { orderId: order.id, orderItemId: orderItem.id },
        body: { reason: cancellationReason },
      },
    );
  typia.assert(cancellationRequest);
  // ── 12. Seller REJECTS the cancellation request ──────────────────────────────
  const updatedRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // ════════════════════════════════════════════════════════════════════════════
  // Sub-test A: Filter by status 'rejected'
  // ════════════════════════════════════════════════════════════════════════════
  const rejectedResult =
    await api.functional.shoppingMall.customer.cancellationRequests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected filter: exactly 1 snapshot",
    rejectedResult.data.length,
    1,
  );
  TestValidator.equals(
    "rejected filter: snapshot status is rejected",
    rejectedResult.data[0]!.status,
    "rejected",
  );
  TestValidator.equals(
    "rejected filter: snapshot reason matches",
    rejectedResult.data[0]!.reason,
    cancellationReason,
  );
  // ════════════════════════════════════════════════════════════════════════════
  // Sub-test B: Filter by status 'approved' — should return empty
  // ════════════════════════════════════════════════════════════════════════════
  const approvedResult =
    await api.functional.shoppingMall.customer.cancellationRequests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved filter: empty data array",
    approvedResult.data.length,
    0,
  );
  TestValidator.equals(
    "approved filter: pagination records is 0",
    approvedResult.pagination.records,
    0,
  );
  // ════════════════════════════════════════════════════════════════════════════
  // Sub-test C: Keyword search against reason text
  // ════════════════════════════════════════════════════════════════════════════
  const keywordResult =
    await api.functional.shoppingMall.customer.cancellationRequests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          keyword: distinctiveKeyword,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(keywordResult);
  TestValidator.predicate(
    "keyword search: at least 1 snapshot returned",
    keywordResult.data.length >= 1,
  );
  TestValidator.predicate(
    "keyword search: snapshot reason contains keyword",
    keywordResult.data[0]!.reason.includes(distinctiveKeyword),
  );
  // ════════════════════════════════════════════════════════════════════════════
  // Sub-test D: No filter — all snapshots
  // ════════════════════════════════════════════════════════════════════════════
  const allResult =
    await api.functional.shoppingMall.customer.cancellationRequests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {} satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "no filter: exactly 1 snapshot total",
    allResult.data.length,
    1,
  );
  TestValidator.equals(
    "no filter: snapshot has status rejected",
    allResult.data[0]!.status,
    "rejected",
  );
  TestValidator.equals(
    "no filter: snapshot has correct reason",
    allResult.data[0]!.reason,
    cancellationReason,
  );
  TestValidator.predicate(
    "no filter: snapshot has id",
    typeof allResult.data[0]!.id === "string",
  );
  TestValidator.predicate(
    "no filter: snapshot has created_at",
    typeof allResult.data[0]!.created_at === "string",
  );
}
