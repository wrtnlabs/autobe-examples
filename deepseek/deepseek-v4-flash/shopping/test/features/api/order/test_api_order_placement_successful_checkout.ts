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
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_order_placement_successful_checkout(
  connection: api.IConnection,
): Promise<void> {
  // ────── 1. SELLER SETUP ──────
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerJoin);
  // 1.1. Create product with specific base price
  const basePrice = 5000;
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: basePrice,
      },
    },
  );
  typia.assert(product);
  // 1.2. Create variant with price override and options
  const variantPrice = 10000;
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: RandomGenerator.alphaNumeric(16),
          price: variantPrice,
          options: [
            { key: "color", value: "Black" },
            { key: "size", value: "Large" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Effective price = variant's price override (10000), not product's base price (5000)
  const effectivePrice = variant.price ?? product.base_price;
  // 1.3. Restock variant with positive inventory
  const inventoryRecord =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        body: {
          quantity_change: 50,
          reason: "seller restock",
        },
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(inventoryRecord);
  // ────── 2. CUSTOMER SETUP ──────
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {});
  typia.assert(customerJoin);
  // 2.1. Create shipping address with all required fields and set as default
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // 2.2. Add variant to cart with quantity = 2
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // ────── 3. PLACE ORDER ──────
  const order = await api.functional.eCommerceMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      } satisfies IECommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // ────── 4. VALIDATIONS ──────
  // 4.1. Auto-generated order code is non-empty
  TestValidator.predicate("order code non-empty", () => order.code.length > 0);
  // 4.2. totalPrice = 2 * variant effective price
  TestValidator.equals("total price", order.totalPrice, effectivePrice * 2);
  // 4.3. Shipping address fields snapshot-copied correctly
  TestValidator.equals(
    "recipient name matches",
    order.shippingRecipientName,
    address.recipient_name,
  );
  TestValidator.equals(
    "phone matches",
    order.shippingPhone,
    address.phone_number,
  );
  TestValidator.equals(
    "street address matches",
    order.shippingStreetAddress,
    address.street_address,
  );
  TestValidator.equals("city matches", order.shippingCity, address.city);
  TestValidator.equals(
    "state province matches",
    order.shippingStateProvince,
    address.state_province,
  );
  TestValidator.equals(
    "postal code matches",
    order.shippingPostalCode,
    address.postal_code,
  );
  TestValidator.equals(
    "country matches",
    order.shippingCountry,
    address.country,
  );
  // 4.4. Exactly one orderItem
  TestValidator.equals("order items count", order.orderItems.length, 1);
  const orderItem = order.orderItems[0]!;
  TestValidator.equals("order item status", orderItem.status, "paid");
  TestValidator.equals("order item quantity", orderItem.quantity, 2);
  TestValidator.equals(
    "order item unit price",
    orderItem.unit_price,
    effectivePrice,
  );
  // 4.5. productVariantSnapshot captures correct data
  TestValidator.equals(
    "snapshot product name",
    orderItem.productVariantSnapshot.productName,
    product.name,
  );
  TestValidator.equals(
    "snapshot product description",
    orderItem.productVariantSnapshot.productDescription,
    product.description,
  );
  TestValidator.equals(
    "snapshot product base price",
    orderItem.productVariantSnapshot.productBasePrice,
    product.base_price,
  );
  TestValidator.equals(
    "snapshot variant sku",
    orderItem.productVariantSnapshot.variantSku,
    variant.sku_code,
  );
  TestValidator.equals(
    "snapshot variant price",
    orderItem.productVariantSnapshot.variantPrice,
    variant.price,
  );
  // 4.6. sellerSnapshot captures correct shop_name and shop_logo
  TestValidator.equals(
    "seller snapshot shop name",
    orderItem.sellerSnapshot.shop_name,
    sellerJoin.profile!.shopName,
  );
  TestValidator.equals(
    "seller snapshot shop logo",
    orderItem.sellerSnapshot.shop_logo,
    sellerJoin.profile!.logoImage,
  );
  // 4.7. All order items have status 'paid' -> overall order status is 'paid'
  for (const item of order.orderItems) {
    TestValidator.equals("all items status paid", item.status, "paid");
  }
}
