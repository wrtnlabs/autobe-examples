import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_admin_order_restore_from_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connections for each actor
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // Authenticate all actors
  await authorize_admin_join(adminConnection, {});
  await authorize_seller_join(sellerConnection, {});
  await authorize_customer_join(customerConnection, {});
  // Admin creates category for product assignment
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Seller creates product in the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // Seller creates variant with stock for purchase
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: 10,
        } satisfies Partial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // Customer adds variant to shopping cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      } satisfies Partial<IEcommerceMallCartItem.ICreate>,
    },
  );
  // Customer checkout to create the order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "Test Recipient",
        recipientPhone: "01012345678",
        streetAddress: "123 Test Street",
        city: "Test City",
        state: null,
        postalCode: "12345",
        country: "Test Country",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify initial order is active (deletedAt is null)
  TestValidator.equals(
    "initial order deletedAt is null",
    order.deletedAt,
    null,
  );
  // Admin soft-deletes the order by setting deletedAt timestamp
  const softDeletedOrder =
    await api.functional.ecommerceMall.admin.orders.update(adminConnection, {
      orderId: order.id,
      body: {
        deletedAt: new Date().toISOString(),
      } satisfies IEcommerceMallOrder.IUpdate,
    });
  typia.assert(softDeletedOrder);
  TestValidator.notEquals(
    "soft deleted order has non-null deletedAt",
    softDeletedOrder.deletedAt,
    null,
  );
  // Admin restores the order by setting deletedAt to null
  const restoredOrder = await api.functional.ecommerceMall.admin.orders.update(
    adminConnection,
    {
      orderId: order.id,
      body: {
        deletedAt: null,
      } satisfies IEcommerceMallOrder.IUpdate,
    },
  );
  typia.assert(restoredOrder);
  // Verification: Order is restored with deletedAt null
  TestValidator.equals(
    "restored order deletedAt is null",
    restoredOrder.deletedAt,
    null,
  );
  // Verification: Order data integrity is preserved after restoration
  TestValidator.equals("order ID preserved", restoredOrder.id, order.id);
  TestValidator.equals(
    "order number preserved",
    restoredOrder.orderNumber,
    order.orderNumber,
  );
  TestValidator.equals(
    "total price preserved",
    restoredOrder.totalPrice,
    order.totalPrice,
  );
  TestValidator.equals(
    "recipient name preserved",
    restoredOrder.recipientName,
    order.recipientName,
  );
  TestValidator.equals(
    "order status preserved",
    restoredOrder.status,
    order.status,
  );
  TestValidator.equals(
    "order items preserved",
    restoredOrder.orderItems.length,
    order.orderItems.length,
  );
}
