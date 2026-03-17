import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_shipment_creation_multiple_items_bundled(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Setup Admin ───────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ─── 2. Create Product Category ───────────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // ─── 3. Setup Seller ──────────────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // ─── 4. Seller submits approval ───────────────────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // ─── 5. Admin approves seller ─────────────────────────────────────────────
  const updatedApproval =
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
  typia.assert(updatedApproval);
  // ─── 6. Seller creates a product ──────────────────────────────────────────
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // ─── 7. Seller creates Variant A ──────────────────────────────────────────
  const skuA = `VAR-A-${typia.random<string & tags.Format<"uuid">>()}`;
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: skuA,
          options: [{ key: "size", value: "Small", sequence: 0 }],
        },
      },
    );
  typia.assert(variantA);
  // ─── 8. Seller adds inventory for Variant A ───────────────────────────────
  const inventoryA =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variantA.id },
        body: {
          quantity: 10,
          note: "Initial stock for Variant A",
        },
      },
    );
  typia.assert(inventoryA);
  // ─── 9. Seller creates Variant B ──────────────────────────────────────────
  const skuB = `VAR-B-${typia.random<string & tags.Format<"uuid">>()}`;
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: skuB,
          options: [{ key: "size", value: "Large", sequence: 0 }],
        },
      },
    );
  typia.assert(variantB);
  // ─── 10. Seller adds inventory for Variant B ──────────────────────────────
  const inventoryB =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variantB.id },
        body: {
          quantity: 10,
          note: "Initial stock for Variant B",
        },
      },
    );
  typia.assert(inventoryB);
  // ─── 11. Register Customer ────────────────────────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // ─── 12. Customer places an order with both variants ─────────────────────
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            product_variant_id: variantA.id,
            quantity: 2,
          },
          {
            product_variant_id: variantB.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // Extract order item IDs for both variants
  const orderItemA = order.items.find(
    (item) => item.productVariant.id === variantA.id,
  );
  const orderItemB = order.items.find(
    (item) => item.productVariant.id === variantB.id,
  );
  TestValidator.predicate("orderItemA exists", orderItemA !== undefined);
  TestValidator.predicate("orderItemB exists", orderItemB !== undefined);
  const orderItemIdA = orderItemA!.id;
  const orderItemIdB = orderItemB!.id;
  // ─── Test Execution: Seller creates shipment bundling both items ──────────
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          carrier: "DHL",
          trackingNumber: "DH112233445",
          orderItemIds: [orderItemIdA, orderItemIdB],
        },
      },
    );
  typia.assert(shipment);
  // ─── Validations ──────────────────────────────────────────────────────────
  // 1. The items array contains exactly 2 entries
  TestValidator.equals("shipment items count", shipment.items.length, 2);
  // 2. Each entry's orderItem.id matches the respective order item IDs
  const shipmentItemIds = shipment.items.map((si) => si.orderItem.id);
  TestValidator.predicate(
    "shipment contains orderItemA",
    shipmentItemIds.includes(orderItemIdA),
  );
  TestValidator.predicate(
    "shipment contains orderItemB",
    shipmentItemIds.includes(orderItemIdB),
  );
  // 3. carrier and tracking_number
  TestValidator.equals("carrier is DHL", shipment.carrier, "DHL");
  TestValidator.equals(
    "tracking number",
    shipment.tracking_number,
    "DH112233445",
  );
  // 4. shipped_at is null
  TestValidator.equals("shipped_at is null", shipment.shipped_at, null);
  // 5. estimated_delivery_at is null
  TestValidator.equals(
    "estimated_delivery_at is null",
    shipment.estimated_delivery_at,
    null,
  );
  // 6. seller.id matches the authenticated seller's UUID
  TestValidator.equals("seller id matches", shipment.seller.id, sellerAuth.id);
  // 7. Both order items' statuses have transitioned to 'shipped'
  const shippedItemA = shipment.items.find(
    (si) => si.orderItem.id === orderItemIdA,
  );
  const shippedItemB = shipment.items.find(
    (si) => si.orderItem.id === orderItemIdB,
  );
  TestValidator.equals(
    "orderItemA status is shipped",
    shippedItemA!.orderItem.status,
    "shipped",
  );
  TestValidator.equals(
    "orderItemB status is shipped",
    shippedItemB!.orderItem.status,
    "shipped",
  );
  // 8. Attempting to create another shipment for same order items returns conflict
  await TestValidator.error(
    "duplicate shipment for already-shipped items should fail",
    async () => {
      await generate_random_shopping_mall_seller_orders_shipments_create(
        sellerConnection,
        {
          params: { orderId: order.id },
          body: {
            carrier: "FedEx",
            trackingNumber: "FX998877665",
            orderItemIds: [orderItemIdA, orderItemIdB],
          },
        },
      );
    },
  );
}
