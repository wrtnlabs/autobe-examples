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

export async function test_api_order_item_detail_with_purchase_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Admin setup ──────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ── 2. Create product category ──────────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: { name: "Electronics" },
    },
  );
  typia.assert(category);
  // ── 3. Seller setup ─────────────────────────────────────────────────────
  const sellerShopName = RandomGenerator.name();
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: { shop_name: sellerShopName },
  });
  // ── 4. Seller submits approval request ──────────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ── 5. Admin approves the seller ─────────────────────────────────────────
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
  // ── 6. Seller creates a product ──────────────────────────────────────────
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productDescription = RandomGenerator.paragraph({ sentences: 3 });
  const basePrice = 19900;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        base_price: basePrice,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // ── 7. Seller adds a variant with SKU-RED-L ──────────────────────────────
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: "SKU-RED-L",
          options: [
            { key: "color", value: "Red", sequence: 0 },
            { key: "size", value: "Large", sequence: 1 },
          ],
        },
      },
    );
  typia.assert(variant);
  // ── 8. Seller adds inventory (quantity=10) ───────────────────────────────
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 10,
          note: "Initial stock",
        },
      },
    );
  typia.assert(inventoryRecord);
  // ── 9. Customer setup ────────────────────────────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // ── 10. Customer places order with quantity=2 ────────────────────────────
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
            quantity: 2,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // Ensure order has at least one item
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItemRef = order.items[0];
  // ── Target call: GET order item detail ───────────────────────────────────
  const orderItem = await api.functional.shoppingMall.customer.orders.items.at(
    customerConnection,
    {
      orderId: order.id,
      itemId: orderItemRef.id,
    },
  );
  typia.assert(orderItem);
  // ── Validations ───────────────────────────────────────────────────────────
  TestValidator.equals("item id matches", orderItem.id, orderItemRef.id);
  TestValidator.equals("orderId matches", orderItem.orderId, order.id);
  TestValidator.equals("quantity equals 2", orderItem.quantity, 2);
  TestValidator.equals("status is paid", orderItem.status, "paid");
  // productVariant validation
  TestValidator.equals(
    "variant sku matches SKU-RED-L",
    orderItem.productVariant.sku,
    "SKU-RED-L",
  );
  const colorOption = orderItem.productVariant.options.find(
    (o) => o.key === "color",
  );
  const sizeOption = orderItem.productVariant.options.find(
    (o) => o.key === "size",
  );
  TestValidator.predicate(
    "color option Red exists",
    colorOption !== undefined && colorOption.value === "Red",
  );
  TestValidator.predicate(
    "size option Large exists",
    sizeOption !== undefined && sizeOption.value === "Large",
  );
  // snapshot validation
  TestValidator.equals(
    "productSnapshot name matches",
    orderItem.snapshot.productSnapshot.name,
    productName,
  );
  TestValidator.equals(
    "productSnapshot basePrice matches",
    orderItem.snapshot.productSnapshot.basePrice,
    basePrice,
  );
  TestValidator.equals(
    "productSnapshot categoryName matches",
    orderItem.snapshot.productSnapshot.categoryName,
    "Electronics",
  );
  TestValidator.equals(
    "productSnapshotSku skuCode matches",
    orderItem.snapshot.productSnapshotSku.skuCode,
    "SKU-RED-L",
  );
  const snapshotColorOption =
    orderItem.snapshot.productSnapshotSku.options.find(
      (o) => o.key === "color",
    );
  const snapshotSizeOption = orderItem.snapshot.productSnapshotSku.options.find(
    (o) => o.key === "size",
  );
  TestValidator.predicate(
    "snapshot color option Red exists",
    snapshotColorOption !== undefined && snapshotColorOption.value === "Red",
  );
  TestValidator.predicate(
    "snapshot size option Large exists",
    snapshotSizeOption !== undefined && snapshotSizeOption.value === "Large",
  );
  TestValidator.equals(
    "sellerProfileSnapshot shopName matches",
    orderItem.snapshot.sellerProfileSnapshot.shopName,
    sellerShopName,
  );
  // null checks
  TestValidator.equals("shipment is null", orderItem.shipment, null);
  TestValidator.equals(
    "cancellationRequest is null",
    orderItem.cancellationRequest,
    null,
  );
  TestValidator.equals("refundRequest is null", orderItem.refundRequest, null);
  TestValidator.equals("review is null", orderItem.review, null);
}
