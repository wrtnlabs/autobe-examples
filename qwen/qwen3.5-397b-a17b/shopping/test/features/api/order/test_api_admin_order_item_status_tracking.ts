import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that an administrator can retrieve order item details for items in different fulfillment statuses to verify the complete order lifecycle tracking capability.
 *
 * **Setup Requirements:**
 * 1. Admin account authenticated
 * 2. Multiple orders with items in different statuses (PAID, SHIPPED, DELIVERED)
 * 3. Each order item should have complete snapshot data preserved
 *
 * **Test Steps:**
 * 1. Admin authenticates via POST /shoppingMall/auth/admin/login
 * 2. Create order scenario 1: Customer places order, item remains in PAID status
 * 3. Admin retrieves the PAID order item via GET /shoppingMall/admin/orders/{orderId}/items/{itemId}
 * 4. Verify status field shows "PAID" and item is awaiting shipment
 * 5. Create order scenario 2: Seller creates shipment for order item
 * 6. Admin retrieves the SHIPPED order item
 * 7. Verify status field shows "SHIPPED" and shipment tracking is accessible
 * 8. Create order scenario 3: Customer confirms delivery of shipment
 * 9. Admin retrieves the DELIVERED order item
 * 10. Verify status field shows "DELIVERED" and delivery timestamp is recorded
 *
 * **Validation Points:**
 * - Each status transition is correctly reflected in the order item status field
 * - Historical snapshots remain unchanged regardless of status changes
 * - Admin has full visibility into all order item states across the platform
 * - Status derivation follows business rules: PAID → SHIPPED → DELIVERED workflow
 *
 * **Business Logic Verification:**
 * - Order item status is independent per item (not order-level)
 * - Snapshots preserve historical accuracy at order time
 * - Admin has full visibility into all order item states across the platform
 */
export async function test_api_admin_order_item_status_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 4. Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 5. Admin creates category
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 6. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 7. Seller creates variant with stock
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          options: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"] as const),
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 8. Customer adds variant to cart
  const cartItem =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 9. Customer creates order (item status: PAID)
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItem = order.items[0];
  TestValidator.equals("order item status is PAID", orderItem.status, "PAID");
  // 10. Admin retrieves PAID order item
  const paidOrderItem = await api.functional.shoppingMall.admin.orders.items.at(
    adminConnection,
    {
      orderId: order.id,
      itemId: orderItem.id,
    },
  );
  typia.assert(paidOrderItem);
  TestValidator.equals("PAID status verified", paidOrderItem.status, "PAID");
  TestValidator.notEquals(
    "product snapshot preserved",
    paidOrderItem.productSnapshot.name,
    "",
  );
  TestValidator.notEquals(
    "variant snapshot preserved",
    paidOrderItem.productVariantSnapshot.sku_code,
    "",
  );
  // 11. Seller creates shipment (changes item status to SHIPPED)
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: [orderItem.id],
        tracking_carrier: RandomGenerator.pick([
          "FedEx",
          "UPS",
          "DHL",
          "USPS",
        ] as const),
        tracking_number: `TRACK-${RandomGenerator.alphaNumeric(12)}`,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  TestValidator.predicate(
    "shipment has tracking",
    shipment.tracking_number !== null,
  );
  // 12. Admin retrieves SHIPPED order item
  const shippedOrderItem =
    await api.functional.shoppingMall.admin.orders.items.at(adminConnection, {
      orderId: order.id,
      itemId: orderItem.id,
    });
  typia.assert(shippedOrderItem);
  TestValidator.equals(
    "SHIPPED status verified",
    shippedOrderItem.status,
    "SHIPPED",
  );
  TestValidator.equals(
    "product snapshot unchanged",
    shippedOrderItem.productSnapshot.id,
    paidOrderItem.productSnapshot.id,
  );
  TestValidator.equals(
    "variant snapshot unchanged",
    shippedOrderItem.productVariantSnapshot.id,
    paidOrderItem.productVariantSnapshot.id,
  );
  // 13. Customer confirms delivery (changes item status to DELIVERED)
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  TestValidator.predicate(
    "delivery confirmed",
    confirmedShipment.delivery_confirmed_at !== null,
  );
  // 14. Admin retrieves DELIVERED order item
  const deliveredOrderItem =
    await api.functional.shoppingMall.admin.orders.items.at(adminConnection, {
      orderId: order.id,
      itemId: orderItem.id,
    });
  typia.assert(deliveredOrderItem);
  TestValidator.equals(
    "DELIVERED status verified",
    deliveredOrderItem.status,
    "DELIVERED",
  );
  TestValidator.equals(
    "product snapshot still preserved",
    deliveredOrderItem.productSnapshot.id,
    paidOrderItem.productSnapshot.id,
  );
  TestValidator.equals(
    "variant snapshot still preserved",
    deliveredOrderItem.productVariantSnapshot.id,
    paidOrderItem.productVariantSnapshot.id,
  );
  // 15. Verify complete status lifecycle
  TestValidator.equals(
    "PAID → SHIPPED transition",
    paidOrderItem.status,
    "PAID",
  );
  TestValidator.equals(
    "SHIPPED → DELIVERED transition",
    shippedOrderItem.status,
    "SHIPPED",
  );
  TestValidator.equals(
    "Final DELIVERED status",
    deliveredOrderItem.status,
    "DELIVERED",
  );
}
