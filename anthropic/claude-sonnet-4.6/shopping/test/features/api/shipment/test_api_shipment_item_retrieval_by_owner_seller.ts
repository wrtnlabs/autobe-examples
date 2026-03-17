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

export async function test_api_shipment_item_retrieval_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Admin setup ───────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ─── 2. Create a product category ────────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphabets(8) } },
  );
  typia.assert(category);
  // ─── 3. Join as seller ───────────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ─── 4. Submit seller approval request ───────────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ─── 5. Approve the seller (admin) ───────────────────────────────────────
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
  // ─── 6. Create a product (seller) ────────────────────────────────────────
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
  // ─── 7. Create a product variant (seller) ────────────────────────────────
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          priceOverride: null,
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "red",
              sequence: 0,
              created_at: new Date().toISOString(),
            },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // ─── 8. Add inventory (seller) ───────────────────────────────────────────
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity: 100,
          note: "Initial stock",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // ─── 9. Join as customer ─────────────────────────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // ─── 10. Place an order (customer) ───────────────────────────────────────
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: "123 Test Street",
        shipping_address_line2: null,
        shipping_city: "Seoul",
        shipping_state: null,
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
  const orderItem = order.items[0];
  typia.assertGuard(orderItem!);
  // ─── 11. Create a shipment (seller) — creates shipment items internally ───
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          carrier: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [orderItem.id],
          shippedAt: new Date().toISOString(),
          estimatedDeliveryAt: null,
        },
        params: { orderId: order.id },
      },
    );
  typia.assert(shipment);
  // Get the shipment item created during shipment creation
  const shipmentItem = shipment.items[0];
  typia.assertGuard(shipmentItem!);
  // ─── 12. GET the shipment item (seller) ──────────────────────────────────
  const retrieved =
    await api.functional.shoppingMall.seller.orders.shipments.items.at(
      sellerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        shipmentItemId: shipmentItem.id,
      },
    );
  typia.assert(retrieved);
  // ─── 13. Validate response ────────────────────────────────────────────────
  TestValidator.equals(
    "shipment item id matches",
    retrieved.id,
    shipmentItem.id,
  );
  TestValidator.equals("shipmentId matches", retrieved.shipmentId, shipment.id);
  TestValidator.equals(
    "orderItem id matches",
    retrieved.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "orderItem status is shipped",
    retrieved.orderItem.status,
    "shipped",
  );
  TestValidator.predicate(
    "createdAt is present",
    retrieved.createdAt.length > 0,
  );
  TestValidator.predicate(
    "orderItem quantity matches",
    retrieved.orderItem.quantity === orderItem.quantity,
  );
  TestValidator.predicate(
    "orderItem unitPrice is positive",
    retrieved.orderItem.unitPrice > 0,
  );
  TestValidator.predicate(
    "snapshot productSnapshot name is present",
    retrieved.orderItem.snapshot.productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "snapshot productSnapshotSku skuCode is present",
    retrieved.orderItem.snapshot.productSnapshotSku.skuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot sellerProfileSnapshot shopName is present",
    retrieved.orderItem.snapshot.sellerProfileSnapshot.shopName.length > 0,
  );
}
