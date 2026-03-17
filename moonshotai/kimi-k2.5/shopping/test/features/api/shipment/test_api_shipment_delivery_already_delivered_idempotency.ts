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
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test idempotency of shipment delivery confirmation.
 * When confirming delivery of an already delivered shipment,
 * the operation should return the existing delivered state without error.
 * This validates graceful handling of duplicate delivery confirmation attempts.
 */
export async function test_api_shipment_delivery_already_delivered_idempotency(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create category
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Create seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Create product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Create variant
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 6. Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Add to cart
  const cartItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.cartItems.create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 8. Checkout - create order
  const order: IEcommerceMallOrder =
    await api.functional.ecommerceMall.customer.checkout.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state: null,
          postalCode: RandomGenerator.alphaNumeric(5),
          country: "US",
        },
      },
    );
  typia.assert(order);
  // Get the order item ID from the created order
  const orderItemId = (order.orderItems[0] as IEntity).id;
  // 9. Create shipment with the order item
  const shipment: IEcommerceMallShipment =
    await api.functional.ecommerceMall.seller.shipments.create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItemId],
          carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 10. First delivery confirmation
  const firstDelivery: IEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.customer.shipments.deliveries.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(firstDelivery);
  // Verify first delivery was successful
  TestValidator.predicate(
    "first delivery has delivery info",
    firstDelivery.delivery !== null,
  );
  TestValidator.predicate(
    "first delivery is not auto-delivered",
    firstDelivery.delivery?.isAutoDelivered === false,
  );
  // 11. Second delivery confirmation - should be idempotent
  const secondDelivery: IEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.customer.shipments.deliveries.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(secondDelivery);
  // 12. Verify idempotency - both responses should be consistent
  TestValidator.equals(
    "shipment ids match",
    firstDelivery.id,
    secondDelivery.id,
  );
  TestValidator.equals(
    "delivery info exists",
    secondDelivery.delivery !== null,
    true,
  );
  TestValidator.equals(
    "delivery ids match",
    firstDelivery.delivery?.id,
    secondDelivery.delivery?.id,
  );
  TestValidator.equals(
    "delivery timestamp consistent",
    firstDelivery.delivery?.deliveredAt,
    secondDelivery.delivery?.deliveredAt,
  );
  TestValidator.equals(
    "auto-delivered flag consistent",
    firstDelivery.delivery?.isAutoDelivered,
    secondDelivery.delivery?.isAutoDelivered,
  );
}