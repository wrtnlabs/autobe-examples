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

export async function test_api_order_detail_view_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Admin: Register ───────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ─── 2. Admin: Create Category ────────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: "Electronics", description: "Electronic products" } },
  );
  typia.assert(category);
  // ─── 3. Seller: Register ──────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const sellerShopName = sellerAuth.shopName;
  // ─── 4. Seller: Submit Approval Request ───────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ─── 5. Admin: Approve Seller ─────────────────────────────────────────
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
  // ─── 6. Seller: Create Product ────────────────────────────────────────
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // ─── 7. Seller: Create Product Variant ───────────────────────────────
  const variantSku = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: variantSku,
          priceOverride: 12000,
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "Red",
              sequence: 0,
              created_at: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // ─── 8. Seller: Add Inventory ─────────────────────────────────────────
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 100,
          note: "Initial stock",
        },
      },
    );
  typia.assert(inventoryRecord);
  // ─── 9. Customer: Register ────────────────────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // ─── 10. Customer: Place Order ────────────────────────────────────────
  const recipientName = RandomGenerator.name();
  const recipientPhone = RandomGenerator.mobile();
  const shippingAddressLine1 = "123 Main Street";
  const shippingCity = "Seoul";
  const shippingPostalCode = "04524";
  const shippingCountry = "KR";
  const orderQuantity = 1;
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        shipping_address_line1: shippingAddressLine1,
        shipping_address_line2: null,
        shipping_city: shippingCity,
        shipping_state: null,
        shipping_postal_code: shippingPostalCode,
        shipping_country: shippingCountry,
        items: [
          {
            product_variant_id: variant.id,
            quantity: orderQuantity,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // ─── 11. Customer: Retrieve Order Details ─────────────────────────────
  const orderDetail = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    { orderId: order.id },
  );
  typia.assert(orderDetail);
  // ─── 12. Validate Order Details ───────────────────────────────────────
  // id matches
  TestValidator.equals("order id matches", orderDetail.id, order.id);
  // status is 'paid'
  TestValidator.equals("order status is paid", orderDetail.status, "paid");
  // total_price = unit_price × quantity
  TestValidator.predicate(
    "total price is positive",
    orderDetail.total_price > 0,
  );
  // shipping address fields match
  TestValidator.equals(
    "recipient_name matches",
    orderDetail.recipient_name,
    recipientName,
  );
  TestValidator.equals(
    "recipient_phone matches",
    orderDetail.recipient_phone,
    recipientPhone,
  );
  TestValidator.equals(
    "shipping_address_line1 matches",
    orderDetail.shipping_address_line1,
    shippingAddressLine1,
  );
  TestValidator.equals(
    "shipping_address_line2 is null",
    orderDetail.shipping_address_line2,
    null,
  );
  TestValidator.equals(
    "shipping_city matches",
    orderDetail.shipping_city,
    shippingCity,
  );
  TestValidator.equals(
    "shipping_state is null",
    orderDetail.shipping_state,
    null,
  );
  TestValidator.equals(
    "shipping_postal_code matches",
    orderDetail.shipping_postal_code,
    shippingPostalCode,
  );
  TestValidator.equals(
    "shipping_country matches",
    orderDetail.shipping_country,
    shippingCountry,
  );
  // customer.id matches
  TestValidator.equals(
    "customer id matches",
    orderDetail.customer.id,
    customerId,
  );
  // items array has exactly one item
  TestValidator.equals("items count is 1", orderDetail.items.length, 1);
  const item = orderDetail.items[0]!;
  // item quantity matches
  TestValidator.equals("item quantity matches", item.quantity, orderQuantity);
  // item status is 'paid'
  TestValidator.equals("item status is paid", item.status, "paid");
  // snapshot is non-null
  TestValidator.predicate(
    "snapshot is not null",
    item.snapshot !== null && item.snapshot !== undefined,
  );
  // snapshot product name matches
  TestValidator.equals(
    "snapshot product name matches",
    item.snapshot.productSnapshot.name,
    productName,
  );
  // snapshot SKU matches
  TestValidator.equals(
    "snapshot sku matches",
    item.snapshot.productSnapshotSku.skuCode,
    variantSku,
  );
  // snapshot seller shop name matches
  TestValidator.equals(
    "snapshot seller shop name matches",
    item.snapshot.sellerProfileSnapshot.shopName,
    sellerShopName,
  );
  // shipments is empty
  TestValidator.equals("shipments is empty", orderDetail.shipments.length, 0);
  // total_price = unit_price × quantity
  TestValidator.equals(
    "total price equals unit price times quantity",
    orderDetail.total_price,
    item.unitPrice * orderQuantity,
  );
}
