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

export async function test_api_seller_shipment_delivery_confirmation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin and create a product category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminSession = await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Authenticate as seller, create a product and a product variant with stock
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerSession = await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate> as any,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
        } satisfies Partial<IEcommerceMallProductVariant.ICreate> as any,
      },
    );
  typia.assert(variant);
  // 3. Authenticate as customer, add the variant to cart, and complete checkout to create an order with 'paid' status
  const customerConnection: api.IConnection = { host: connection.host };
  const customerSession = await authorize_customer_join(customerConnection, {});
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies Partial<IEcommerceMallCartItem.ICreate> as any,
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has at least one paid order item
  type OrderItemWithRefs = IEcommerceMallOrderItem & IEntity & { productVariantId: string };
  const orderItem = (order.orderItems as OrderItemWithRefs[]).find(
    (item) => item.productVariantId === variant.id && item.status === "paid",
  );
  if (!orderItem) {
    throw new Error("Expected paid order item not found");
  }
  // 4. Authenticate as seller, create a shipment containing the paid order items
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItem.id],
        carrierName: "FedEx",
        trackingNumber: typia.random<string & tags.Pattern<"^[0-9]{12,20}$">>() satisfies string as string,
      } satisfies Partial<IEcommerceMallShipment.ICreate> as any,
    },
  );
  typia.assert(shipment);
  // Verify shipment has the correct order item and it's now shipped
  type ShipmentItemWithOrderItem = IEcommerceMallShipmentItem & { orderItem: IEcommerceMallOrderItem & IEntity };
  const shipmentOrderItem = (shipment.shipmentItems as ShipmentItemWithOrderItem[]).find(
    (si) => si.orderItem.id === orderItem.id,
  );
  if (!shipmentOrderItem) {
    throw new Error("Order item not found in shipment");
  }
  TestValidator.equals(
    "Order item status should be 'shipped' after shipment creation",
    shipmentOrderItem.orderItem.status,
    "shipped",
  );
  // 5. Call the target endpoint to confirm delivery of the shipment
  const deliveryResult: IEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.seller.shipments.deliveries.confirmDelivery(
      sellerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryResult);
  // 6. Verify delivery confirmation
  TestValidator.equals(
    "Shipment delivery should be confirmed",
    deliveryResult.delivery !== null,
    true,
  );
  if (deliveryResult.delivery) {
    TestValidator.equals(
      "Delivery timestamp should be recorded",
      deliveryResult.delivery.deliveredAt !== null,
      true,
    );
  }
}