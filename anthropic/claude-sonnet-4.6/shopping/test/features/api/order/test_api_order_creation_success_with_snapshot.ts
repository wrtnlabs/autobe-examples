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

export async function test_api_order_creation_success_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // ==========================================
  // 1. Admin Setup
  // ==========================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Admin creates category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics",
        description: "Electronic products category",
      },
    },
  );
  typia.assert(category);
  // ==========================================
  // 3. Seller Setup
  // ==========================================
  const sellerShopName = `Shop-${RandomGenerator.alphabets(8)}`;
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: sellerShopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 4. Seller submits approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(approvalRequest);
  // 5. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approvalRequest.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedSeller);
  // ==========================================
  // 6. Seller creates product
  // ==========================================
  const productName = "Wireless Earbuds";
  const productBasePrice = 50000;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: "High quality wireless earbuds",
        base_price: productBasePrice,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 7. Seller creates a variant (EARBUDS-BLACK, color=Black)
  const variantSku = "EARBUDS-BLACK";
  const variantPriceOverride = 45000;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: variantSku,
          priceOverride: variantPriceOverride,
          options: [
            {
              key: "color",
              value: "Black",
              sequence: 0,
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // 8. Seller adds inventory (100 units)
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity: 100,
          note: "Initial stock for Wireless Earbuds Black",
        },
      },
    );
  typia.assert(inventoryRecord);
  // ==========================================
  // 9. Customer Setup
  // ==========================================
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerNickname = RandomGenerator.name();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      nickname: customerNickname,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // ==========================================
  // 10. Customer places order
  // ==========================================
  const recipientName = "John Doe";
  const recipientPhone = "01012345678";
  const addressLine1 = "123 Main Street";
  const city = "Seoul";
  const postalCode = "04524";
  const country = "KR";
  const orderQuantity = 2;
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        shipping_address_line1: addressLine1,
        shipping_address_line2: null,
        shipping_city: city,
        shipping_state: null,
        shipping_postal_code: postalCode,
        shipping_country: country,
        items: [
          {
            product_variant_id: variant.id,
            quantity: orderQuantity,
          } satisfies IShoppingMallOrder.IItem,
        ],
      },
    },
  );
  typia.assert(order);
  // ==========================================
  // 11. Assertions
  // ==========================================
  // Order status
  TestValidator.equals("order status is paid", order.status, "paid");
  // Total price: variantPriceOverride * quantity
  const expectedTotalPrice = variantPriceOverride * orderQuantity;
  TestValidator.equals(
    "total_price matches variant price × quantity",
    order.total_price,
    expectedTotalPrice,
  );
  // Items array has exactly 1 entry
  TestValidator.equals("items count is 1", order.items.length, 1);
  const orderItem = order.items[0]!;
  // Item status and quantity
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  TestValidator.equals(
    "order item quantity is 2",
    orderItem.quantity,
    orderQuantity,
  );
  // Snapshot assertions
  const snapshot = orderItem.snapshot;
  // productSnapshot.name matches product name
  TestValidator.equals(
    "productSnapshot.name matches",
    snapshot.productSnapshot.name,
    productName,
  );
  // productSnapshotSku.skuCode matches variant SKU
  TestValidator.equals(
    "productSnapshotSku.skuCode matches",
    snapshot.productSnapshotSku.skuCode,
    variantSku,
  );
  // productSnapshotSku.options contains color = Black
  const colorOption = snapshot.productSnapshotSku.options.find(
    (opt) => opt.key === "color" && opt.value === "Black",
  );
  TestValidator.predicate(
    "productSnapshotSku.options contains color=Black",
    colorOption !== undefined,
  );
  // sellerProfileSnapshot.shopName matches seller's shop name
  TestValidator.equals(
    "sellerProfileSnapshot.shopName matches",
    snapshot.sellerProfileSnapshot.shopName,
    sellerShopName,
  );
  // Shipping address fields match
  TestValidator.equals(
    "recipient_name matches",
    order.recipient_name,
    recipientName,
  );
  TestValidator.equals(
    "recipient_phone matches",
    order.recipient_phone,
    recipientPhone,
  );
  TestValidator.equals(
    "shipping_address_line1 matches",
    order.shipping_address_line1,
    addressLine1,
  );
  TestValidator.equals("shipping_city matches", order.shipping_city, city);
  TestValidator.equals(
    "shipping_postal_code matches",
    order.shipping_postal_code,
    postalCode,
  );
  TestValidator.equals(
    "shipping_country matches",
    order.shipping_country,
    country,
  );
  // Customer matches authenticated customer
  TestValidator.equals(
    "customer email matches",
    order.customer.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer id matches",
    order.customer.id,
    customerAuth.id,
  );
  // shipments array is initially empty
  TestValidator.equals("shipments is empty", order.shipments.length, 0);
  // No cancellationRequest or refundRequest on order item
  TestValidator.equals(
    "no cancellationRequest",
    orderItem.cancellationRequest,
    null,
  );
  TestValidator.equals("no refundRequest", orderItem.refundRequest, null);
}
