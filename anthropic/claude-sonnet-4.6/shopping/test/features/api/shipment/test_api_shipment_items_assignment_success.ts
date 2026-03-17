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

export async function test_api_shipment_items_assignment_success(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Admin setup ─────────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphabets(8) } },
  );
  typia.assert(category);
  // ── 2. Seller setup ────────────────────────────────────────────────────────
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // Admin approves the seller
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
  // ── 3. Product + Variant + Inventory setup ─────────────────────────────────
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
  // Create first variant
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: `SKU-${RandomGenerator.alphaNumeric(10)}-A`,
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
  typia.assert(variant1);
  // Create second variant
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: `SKU-${RandomGenerator.alphaNumeric(10)}-B`,
          priceOverride: null,
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "blue",
              sequence: 0,
              created_at: new Date().toISOString(),
            },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  // Create inventory for variant1
  const inventory1 =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: { quantity: 10, note: "Initial stock for variant 1" },
        params: { productId: product.id, variantId: variant1.id },
      },
    );
  typia.assert(inventory1);
  // Create inventory for variant2
  const inventory2 =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: { quantity: 10, note: "Initial stock for variant 2" },
        params: { productId: product.id, variantId: variant2.id },
      },
    );
  typia.assert(inventory2);
  // ── 4. Customer setup and order ─────────────────────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Customer places an order with both variants
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        shipping_address_line1: "123 Test Street",
        shipping_address_line2: null,
        shipping_city: "Seoul",
        shipping_state: "Seoul",
        shipping_postal_code: "04524",
        shipping_country: "KR",
        items: [
          {
            product_variant_id: variant1.id,
            quantity: 1,
          },
          {
            product_variant_id: variant2.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // Find order items for variant1 and variant2
  const foundItem1 = order.items.find(
    (item) => item.productVariant.id === variant1.id,
  );
  const foundItem2 = order.items.find(
    (item) => item.productVariant.id === variant2.id,
  );
  TestValidator.predicate(
    "order item 1 exists",
    () => foundItem1 !== undefined,
  );
  TestValidator.predicate(
    "order item 2 exists",
    () => foundItem2 !== undefined,
  );
  // Assign to const with non-null assertion for type safety
  const orderItem1 = foundItem1!;
  const orderItem2 = foundItem2!;
  // Verify both items have 'paid' status
  TestValidator.equals(
    "order item 1 status is paid",
    orderItem1.status,
    "paid",
  );
  TestValidator.equals(
    "order item 2 status is paid",
    orderItem2.status,
    "paid",
  );
  // ── 5. Create a shipment with item1 (logistics header + first item) ─────────
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          carrier: "FedEx",
          trackingNumber: `TRK-${RandomGenerator.alphaNumeric(12)}`,
          orderItemIds: [orderItem1.id],
          shippedAt: new Date().toISOString(),
          estimatedDeliveryAt: null,
        },
        params: { orderId: order.id },
      },
    );
  typia.assert(shipment);
  // ── 6. TARGET: Assign item2 to the existing shipment ──────────────────────
  const shipmentItem =
    await api.functional.shoppingMall.seller.orders.shipments.items.create(
      sellerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          orderItemIds: [orderItem2.id],
        } satisfies IShoppingMallShipmentItem.ICreate,
      },
    );
  typia.assert(shipmentItem);
  // ── 7. Assertions ───────────────────────────────────────────────────────────
  // Verify the returned shipment item has the correct shipmentId
  TestValidator.equals(
    "shipment item has correct shipmentId",
    shipmentItem.shipmentId,
    shipment.id,
  );
  // Verify the order item status transitioned to 'shipped'
  TestValidator.equals(
    "order item 2 status is now shipped",
    shipmentItem.orderItem.status,
    "shipped",
  );
  // Verify the order item ID matches item2
  TestValidator.equals(
    "shipment item references correct order item",
    shipmentItem.orderItem.id,
    orderItem2.id,
  );
  // ── 8. Duplicate assignment should fail ────────────────────────────────────
  await TestValidator.error(
    "duplicate assignment of already-shipped item fails",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.items.create(
        sellerConnection,
        {
          orderId: order.id,
          shipmentId: shipment.id,
          body: {
            orderItemIds: [orderItem2.id],
          } satisfies IShoppingMallShipmentItem.ICreate,
        },
      );
    },
  );
}
