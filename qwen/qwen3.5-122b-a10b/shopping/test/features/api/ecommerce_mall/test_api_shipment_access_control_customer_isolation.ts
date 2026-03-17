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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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

/**
 * Test shipment access control with customer isolation.
 * Validates that customers can only view shipments for their own orders.
 *
 * Test Flow:
 * 1. Create two customers (A and B) and a seller
 * 2. Seller creates a product with variant
 * 3. Both customers create orders with shipping addresses
 * 4. Seller creates shipments for both orders
 * 5. Customer A queries their own order shipments - SUCCESS
 * 6. Customer A queries Customer B's order shipments - FAILS with 403
 */
export async function test_api_shipment_access_control_customer_isolation(
  connection: api.IConnection,
): Promise<void> {
  // ========== SETUP: Create Actors ==========
  // Create Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // Create Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // Create Seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // ========== SETUP: Create Product ==========
  // Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
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
  typia.assert(product);
  // Create product variant - FIXED: productId moved to params
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.alphabets(5),
            },
          ],
          price: null,
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // ========== SETUP: Create Orders ==========
  // Customer A creates shipping address
  const addressA =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerAConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(10),
          country: RandomGenerator.name(),
          is_default: true,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(addressA);
  // Customer A adds item to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerAConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // Customer A creates order
  const orderA = await generate_random_ecommerce_mall_customer_orders_create(
    customerAConnection,
    {
      body: {
        shipping_recipient_name: addressA.recipientName,
        shipping_phone_number: addressA.phoneNumber,
        shipping_street_address: addressA.streetAddress,
        shipping_city: addressA.city,
        shipping_state: addressA.stateProvince,
        shipping_postal_code: addressA.postalCode,
        shipping_country: addressA.country,
        address_id: addressA.id,
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(orderA);
  // Customer B creates shipping address
  const addressB =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerBConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(10),
          country: RandomGenerator.name(),
          is_default: true,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(addressB);
  // Customer B adds item to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerBConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // Customer B creates order
  const orderB = await generate_random_ecommerce_mall_customer_orders_create(
    customerBConnection,
    {
      body: {
        shipping_recipient_name: addressB.recipientName,
        shipping_phone_number: addressB.phoneNumber,
        shipping_street_address: addressB.streetAddress,
        shipping_city: addressB.city,
        shipping_state: addressB.stateProvince,
        shipping_postal_code: addressB.postalCode,
        shipping_country: addressB.country,
        address_id: addressB.id,
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(orderB);
  // ========== SETUP: Create Shipments ==========
  // Seller creates shipment for Customer A's order
  const shipmentA =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          trackingNumber: RandomGenerator.alphaNumeric(15),
          carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL"]),
          shippedAt: new Date().toISOString(),
          orderItemIds: orderA.order_items.map((item) => item.id),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipmentA);
  // Seller creates shipment for Customer B's order
  const shipmentB =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          trackingNumber: RandomGenerator.alphaNumeric(15),
          carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL"]),
          shippedAt: new Date().toISOString(),
          orderItemIds: orderB.order_items.map((item) => item.id),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipmentB);
  // ========== TEST: Customer A queries their own order shipments - SUCCESS ==========
  const customerAOwnShipments =
    await api.functional.ecommerceMall.customer.orders.shipments.index(
      customerAConnection,
      {
        orderId: orderA.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(customerAOwnShipments);
  TestValidator.equals(
    "Customer A can view their own order shipments",
    customerAOwnShipments.data.length,
    1,
  );
  TestValidator.equals(
    "Customer A's shipment tracking number matches",
    customerAOwnShipments.data[0].tracking_number,
    shipmentA.tracking_number,
  );
  // ========== TEST: Customer A queries Customer B's order shipments - FAILS ==========
  await TestValidator.httpError(
    "Customer A cannot view Customer B's order shipments",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.orders.shipments.index(
        customerAConnection,
        {
          orderId: orderB.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    },
  );
}