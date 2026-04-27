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

/**
 * Test that a seller can successfully retrieve their own shipment details after creating it.
 *
 * Validates the complete shipment retrieval flow: seller setup (product, variant, inventory), customer setup (address, cart, order), shipment creation by seller, and subsequent retrieval by ID. Ensures the shipment record, its nested order item (with 'shipped' status), product-variant snapshot, and seller snapshot are all correctly returned.
 *
 * 1. Seller joins, creates a product with a variant, and adds inventory stock (restock of 100).
 * 2. Customer joins, creates a shipping address, adds the variant to the cart, and places an order.
 * 3. Seller creates a shipment containing the order item (transitions to 'shipped' status).
 * 4. Seller retrieves the shipment by its ID.
 * 5. Validates the top-level fields (id, carrier_name, tracking_number, shipped_at is non-null, delivered_at is null, seller id and shop_name, one shipment item).
 * 6. Validates the order item within the shipment (status is 'shipped', quantity, unit_price, subtotal).
 * 7. Validates the preserved product-variant snapshot (productName, variantSku, variantOptions, productBasePrice).
 * 8. Validates the seller snapshot (shop_name).
 */
export async function test_api_shipment_retrieval_by_seller_after_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup: join, create product, variant, and add inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        quantity_change: 100,
        reason: "seller restock",
      },
    },
  );
  // 2. Customer setup: join, create address, add to cart, and place order
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // 3. Seller creates a shipment containing the paid order item
  const orderItem = order.orderItems[0];
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // 4. Seller retrieves the shipment by ID
  const retrieved = await api.functional.eCommerceMall.seller.shipments.at(
    sellerConnection,
    {
      shipmentId: shipment.id,
    },
  );
  typia.assert(retrieved);
  // 5. Validate top-level fields
  TestValidator.equals("shipment id matches", retrieved.id, shipment.id);
  TestValidator.equals(
    "carrier_name matches",
    retrieved.carrier_name,
    shipment.carrier_name,
  );
  TestValidator.equals(
    "tracking_number matches",
    retrieved.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.predicate(
    "shipped_at is non-null",
    retrieved.shipped_at !== null,
  );
  TestValidator.predicate(
    "delivered_at is null",
    retrieved.delivered_at === null,
  );
  TestValidator.equals("seller id matches", retrieved.seller.id, sellerAuth.id);
  TestValidator.equals(
    "seller shop_name matches",
    retrieved.seller.profile.shop_name,
    sellerAuth.profile!.shopName,
  );
  TestValidator.equals(
    "shipment items count",
    retrieved.shipmentItems.length,
    1,
  );
  // 6. Validate order item within the shipment
  const shipmentItem = retrieved.shipmentItems[0];
  TestValidator.equals(
    "order item status is shipped",
    shipmentItem.orderItem.status,
    "shipped",
  );
  TestValidator.equals(
    "order item quantity matches",
    shipmentItem.orderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "order item unit_price matches",
    shipmentItem.orderItem.unit_price,
    orderItem.unit_price,
  );
  TestValidator.equals(
    "order item subtotal matches",
    shipmentItem.orderItem.subtotal,
    orderItem.unit_price * orderItem.quantity,
  );
  // 7. Validate product-variant snapshot
  TestValidator.equals(
    "snapshot product name matches",
    shipmentItem.snapshot.productName,
    orderItem.productVariantSnapshot.productName,
  );
  TestValidator.equals(
    "snapshot variant sku matches",
    shipmentItem.snapshot.variantSku,
    orderItem.productVariantSnapshot.variantSku,
  );
  TestValidator.equals(
    "snapshot variant options match",
    shipmentItem.snapshot.variantOptions,
    orderItem.productVariantSnapshot.variantOptions,
  );
  TestValidator.equals(
    "snapshot product base price matches",
    shipmentItem.snapshot.productBasePrice,
    orderItem.productVariantSnapshot.productBasePrice,
  );
  // 8. Validate seller snapshot
  TestValidator.equals(
    "seller snapshot shop_name matches",
    shipmentItem.sellerSnapshot.shop_name,
    sellerAuth.profile!.shopName,
  );
}
