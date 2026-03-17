import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_multiple_shipments_same_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Admin approves seller
  // Note: In simulation mode, seller is already approved
  // 4. Create category
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 5. Seller creates first product
  const product1 = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  // 6. Create first product variant
  const variant1 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product1.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(5)}`,
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: 10,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // 7. Seller creates second product
  const product2 = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // 8. Create second product variant
  const variant2 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product2.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(5)}`,
          optionValues: [{ key: "size", value: "Large" }],
          stockQuantity: 10,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 9. Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 10. Customer creates shipping address
  const address = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphabets(5),
        country: "South Korea",
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 11. Customer adds first variant to cart
  await api.functional.ecommerceMall.customer.cart_items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variant1.id,
        quantity: 2,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 12. Customer adds second variant to cart
  await api.functional.ecommerceMall.customer.cart_items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variant2.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 13. Customer places order with both items
  const order = await api.functional.ecommerceMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: address.recipientName,
        shipping_phone_number: address.phoneNumber,
        shipping_street_address: address.streetAddress,
        shipping_city: address.city,
        shipping_state: address.stateProvince,
        shipping_postal_code: address.postalCode,
        shipping_country: address.country,
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 14. Verify order has 2 items
  TestValidator.equals("order has 2 items", order.order_items.length, 2);
  // 15. Seller creates first shipment with first item only
  const shipment1 = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        trackingNumber: `TRACK-${RandomGenerator.alphabets(8)}`,
        carrierName: "Korea Post",
        shippedAt: new Date().toISOString(),
        orderItemIds: [order.order_items[0].id],
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment1);
  // 16. Verify first shipment has 1 item
  TestValidator.equals("shipment1 has 1 item", shipment1.order_items.length, 1);
  TestValidator.equals(
    "shipment1 tracking number",
    shipment1.tracking_number,
    `TRACK-${RandomGenerator.alphabets(8)}`,
  );
  TestValidator.equals(
    "shipment1 carrier",
    shipment1.carrier_name,
    "Korea Post",
  );
  // 17. Fetch updated order to check item statuses
  const updatedOrder =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
      {
        body: {
          shipping_recipient_name: address.recipientName,
          shipping_phone_number: address.phoneNumber,
          shipping_street_address: address.streetAddress,
          shipping_city: address.city,
          shipping_state: address.stateProvince,
          shipping_postal_code: address.postalCode,
          shipping_country: address.country,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(updatedOrder);
  // 18. Seller creates second shipment with second item only
  const shipment2 = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        trackingNumber: `TRACK-${RandomGenerator.alphabets(8)}`,
        carrierName: "CJ Logistics",
        shippedAt: new Date().toISOString(),
        orderItemIds: [order.order_items[1].id],
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  // 19. Verify second shipment has 1 item
  TestValidator.equals("shipment2 has 1 item", shipment2.order_items.length, 1);
  TestValidator.notEquals(
    "shipments have different tracking numbers",
    shipment1.tracking_number,
    shipment2.tracking_number,
  );
  TestValidator.notEquals(
    "shipments have different carriers",
    shipment1.carrier_name,
    shipment2.carrier_name,
  );
  // 20. Verify order has 2 shipments now
  TestValidator.equals(
    "order has 2 shipments",
    updatedOrder.shipments.length,
    2,
  );
}