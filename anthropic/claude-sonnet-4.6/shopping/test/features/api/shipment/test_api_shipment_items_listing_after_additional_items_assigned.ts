import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
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
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_orders_shipments_items_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_item } from "../../../prepare/prepare_random_shopping_mall_shipment_item";

export async function test_api_shipment_items_listing_after_additional_items_assigned(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Admin setup ───────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ─── 2. Seller setup ──────────────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // ─── 3. Admin creates category ────────────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // ─── 4. Seller submits approval request ───────────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // ─── 5. Admin approves seller ─────────────────────────────────────────────
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
  // ─── 6. Seller creates product ────────────────────────────────────────────
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // ─── 7a. Seller adds first variant ────────────────────────────────────────
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            {
              key: "color",
              value: "red",
              sequence: 0,
            },
          ],
        },
      },
    );
  typia.assert(variant1);
  // ─── 7b. Seller adds second variant ───────────────────────────────────────
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: `SKU-B-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            {
              key: "color",
              value: "blue",
              sequence: 0,
            },
          ],
        },
      },
    );
  typia.assert(variant2);
  // ─── 8a. Seller adds inventory for first variant ───────────────────────────
  const inv1 =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant1.id },
        body: { quantity: 10, note: "Initial stock" },
      },
    );
  typia.assert(inv1);
  // ─── 8b. Seller adds inventory for second variant ─────────────────────────
  const inv2 =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant2.id },
        body: { quantity: 10, note: "Initial stock" },
      },
    );
  typia.assert(inv2);
  // ─── 9. Customer setup ────────────────────────────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // ─── 10. Customer places order with both variants ─────────────────────────
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          { product_variant_id: variant1.id, quantity: 1 },
          { product_variant_id: variant2.id, quantity: 1 },
        ],
      },
    },
  );
  typia.assert(order);
  // Find the two order items
  const orderItem1 = order.items.find(
    (item) => item.productVariant.id === variant1.id,
  );
  const orderItem2 = order.items.find(
    (item) => item.productVariant.id === variant2.id,
  );
  TestValidator.predicate(
    "order has item for variant1",
    orderItem1 !== undefined,
  );
  TestValidator.predicate(
    "order has item for variant2",
    orderItem2 !== undefined,
  );
  // ─── 11. Seller creates shipment with only the FIRST order item ────────────
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          carrier: "TestCarrier",
          orderItemIds: [orderItem1!.id],
        },
      },
    );
  typia.assert(shipment);
  // ─── 12. Seller assigns SECOND order item to the same shipment ────────────
  const additionalItem =
    await generate_random_shopping_mall_seller_orders_shipments_items_create(
      sellerConnection,
      {
        params: { orderId: order.id, shipmentId: shipment.id },
        body: {
          orderItemIds: [orderItem2!.id],
        },
      },
    );
  typia.assert(additionalItem);
  // ─── Test Execution: List all items in the shipment ───────────────────────
  const result =
    await api.functional.shoppingMall.seller.orders.shipments.items.index(
      sellerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {} satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(result);
  // ─── Validations ──────────────────────────────────────────────────────────
  TestValidator.equals(
    "pagination records equals 2",
    result.pagination.records,
    2,
  );
  TestValidator.equals("data array has 2 items", result.data.length, 2);
  // Both items should have status 'shipped'
  for (const item of result.data) {
    TestValidator.equals(
      "order item status is shipped",
      item.orderItem.status,
      "shipped",
    );
  }
  // Each item has a distinct orderItem.id
  const itemIds = result.data.map((item) => item.orderItem.id);
  TestValidator.predicate("item ids are distinct", new Set(itemIds).size === 2);
  TestValidator.predicate(
    "item1 id present in result",
    itemIds.includes(orderItem1!.id),
  );
  TestValidator.predicate(
    "item2 id present in result",
    itemIds.includes(orderItem2!.id),
  );
  // The created_at timestamps of the two shipment items differ
  const createdAts = result.data.map((item) => item.created_at);
  TestValidator.predicate(
    "shipment item created_at timestamps differ",
    createdAts[0] !== createdAts[1],
  );
  // Verify snapshot data is present for each item (snapshot immutability)
  for (const item of result.data) {
    TestValidator.predicate(
      "snapshot present",
      item.orderItem.snapshot !== undefined && item.orderItem.snapshot !== null,
    );
    TestValidator.predicate(
      "snapshot productSnapshotSku present",
      item.orderItem.snapshot.productSnapshotSku !== undefined,
    );
  }
  // Verify SKU codes are distinct (snapshot immutability business rule)
  const skuCodes = result.data.map(
    (item) => item.orderItem.snapshot.productSnapshotSku.skuCode,
  );
  TestValidator.predicate(
    "sku codes are distinct",
    new Set(skuCodes).size === 2,
  );
}
