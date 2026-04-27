import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_order_cancellable_items_empty_when_all_shipped(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Seller: create a product
  const product = await api.functional.eCommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: null,
        base_price: typia.random<number & tags.Minimum<1000>>(),
      } satisfies IECommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Seller: create variant 1 (SKU-RED)
  const variant1 =
    await api.functional.eCommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-RED-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            { key: "color", value: "Red" },
          ] satisfies IECommerceMallProductVariant.IOption[],
        } satisfies IECommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // Seller: create variant 2 (SKU-BLUE)
  const variant2 =
    await api.functional.eCommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-BLUE-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            { key: "color", value: "Blue" },
          ] satisfies IECommerceMallProductVariant.IOption[],
        } satisfies IECommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // Seller: restock variant 1
  const inv1 =
    await api.functional.eCommerceMall.seller.products.variants.inventory.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant1.id,
        body: {
          quantity_change: 50,
          reason: "seller restock",
        } satisfies IECommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inv1);
  // Seller: restock variant 2
  const inv2 =
    await api.functional.eCommerceMall.seller.products.variants.inventory.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant2.id,
        body: {
          quantity_change: 50,
          reason: "seller restock",
        } satisfies IECommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inv2);
  // Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Customer: create a shipping address
  const address = await api.functional.eCommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.alphabets(12),
        city: RandomGenerator.alphabets(8),
        state_province: RandomGenerator.alphabets(8),
        postal_code: "12345",
        country: "United States",
        is_default: true,
      } satisfies IECommerceMallCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // Customer: add variant 1 to cart
  const cart1 = await api.functional.eCommerceMall.customer.cart_items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variant1.id,
        quantity: 1,
      } satisfies IECommerceMallCartItem.ICreate,
    },
  );
  typia.assert(cart1);
  // Customer: add variant 2 to cart
  const cart2 = await api.functional.eCommerceMall.customer.cart_items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variant2.id,
        quantity: 1,
      } satisfies IECommerceMallCartItem.ICreate,
    },
  );
  typia.assert(cart2);
  // Customer: place the order
  const order = await api.functional.eCommerceMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      } satisfies IECommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Seller: create a shipment with all order items (transitions them to 'shipped')
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipment = await api.functional.eCommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        carrierName: "Test Carrier",
        trackingNumber: `TRACK-${RandomGenerator.alphaNumeric(10)}`,
        orderItemIds: orderItemIds,
      } satisfies IECommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Customer: query cancellable items - should be empty since all items are shipped
  const cancellableItems =
    await api.functional.eCommerceMall.customer.orders.cancellable_items.cancellable(
      customerConnection,
      {
        orderCode: order.code,
      },
    );
  typia.assert(cancellableItems);
  // Validate that no items are eligible for cancellation
  // Since the API returns an array of ICancellableItem, use typia.is to check array emptiness
  TestValidator.predicate(
    "cancellable items should be empty when all items are shipped",
    () => {
      const items = cancellableItems as any;
      return (
        typeof items === "object" &&
        items !== null &&
        typeof items.length === "number" &&
        items.length === 0
      );
    },
  );
}
