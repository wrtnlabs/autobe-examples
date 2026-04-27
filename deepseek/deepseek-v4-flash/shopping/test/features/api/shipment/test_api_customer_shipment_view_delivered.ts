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
 * Verify that a customer can retrieve shipment details after confirming delivery.
 *
 * Validates the full workflow: seller creates product with variant and inventory,
 * customer places order, seller ships, customer confirms delivery, then retrieves
 * the shipment detail with all delivered_at and status fields correctly populated.
 *
 * 1. Seller registers via authorize_seller_join.
 * 2. Seller creates a product with variants and restocks inventory.
 * 3. Customer registers via authorize_customer_join.
 * 4. Customer creates a shipping address.
 * 5. Customer adds the variant to cart and places an order.
 * 6. Seller creates a shipment with tracking info; items become 'shipped'.
 * 7. Customer confirms delivery; items become 'delivered'.
 * 8. Customer retrieves shipment via GET endpoint and validates all fields.
 */
export async function test_api_customer_shipment_view_delivered(
  connection: api.IConnection,
): Promise<void> {
  // ---- Seller setup ----
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
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity_change: 10,
        reason: "seller restock",
      },
    },
  );
  // ---- Customer setup ----
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
  // ---- Seller creates shipment ----
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: orderItemIds,
        },
      },
    );
  typia.assert(shipment);
  // ---- Customer confirms delivery ----
  const confirmedShipment =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(confirmedShipment);
  // ---- Customer retrieves shipment details ----
  const retrievedShipment =
    await api.functional.eCommerceMall.customer.shipments.at(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(retrievedShipment);
  // ---- Validation ----
  TestValidator.equals(
    "shipment id matches",
    retrievedShipment.id,
    shipment.id,
  );
  TestValidator.predicate(
    "carrier_name exists",
    retrievedShipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "tracking_number exists",
    retrievedShipment.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "shipped_at is non-null",
    retrievedShipment.shipped_at !== null,
  );
  TestValidator.predicate(
    "delivered_at is non-null",
    retrievedShipment.delivered_at !== null,
  );
  TestValidator.predicate(
    "delivered_at is after shipped_at",
    new Date(retrievedShipment.delivered_at!) >
      new Date(retrievedShipment.shipped_at),
  );
  TestValidator.predicate(
    "seller has shop_name",
    retrievedShipment.seller.profile.shop_name.length > 0,
  );
  TestValidator.predicate(
    "shipmentItems is non-empty",
    retrievedShipment.shipmentItems.length > 0,
  );
  for (const item of retrievedShipment.shipmentItems) {
    TestValidator.equals(
      "order item status is delivered",
      item.orderItem.status,
      "delivered",
    );
    TestValidator.predicate(
      "snapshot has productName",
      item.snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "snapshot has variantSku",
      item.snapshot.variantSku.length > 0,
    );
    TestValidator.predicate(
      "snapshot has variantOptions",
      item.snapshot.variantOptions.length > 0,
    );
    TestValidator.predicate(
      "sellerSnapshot has shop_name",
      item.sellerSnapshot.shop_name.length > 0,
    );
    TestValidator.predicate("snapshot object present", !!item.snapshot);
    TestValidator.predicate(
      "sellerSnapshot object present",
      !!item.sellerSnapshot,
    );
  }
}
