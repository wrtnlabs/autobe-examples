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
 * Test customer viewing shipment tracking information for an order from a single seller.
 *
 * This test validates the complete shipment tracking workflow:
 * 1. Customer registers and logs in
 * 2. Seller registers, logs in, and gets approved by admin
 * 3. Admin creates category
 * 4. Seller creates product with variants
 * 5. Customer creates shipping address
 * 6. Customer adds variant to cart
 * 7. Customer places order
 * 8. Seller creates shipment(s) for order items
 * 9. Customer queries shipments for the order
 * 10. Validate shipment tracking information structure and content
 */
export async function test_api_shipment_tracking_single_seller_order(
  connection: api.IConnection,
): Promise<void> {
  // ========== SETUP: Create Admin ==========
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>();
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Login admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // ========== SETUP: Create Category ==========
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // ========== SETUP: Create Seller ==========
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Login seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // ========== SETUP: Create Product with Variants ==========
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create first variant
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: typia.random<string & tags.Format<"uuid">>(),
          optionValues: [{ key: "color", value: "Red" }],
          price: null,
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // Create second variant
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: typia.random<string & tags.Format<"uuid">>(),
          optionValues: [{ key: "color", value: "Blue" }],
          price: null,
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // ========== SETUP: Create Customer ==========
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Login customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // ========== SETUP: Create Shipping Address ==========
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerLoginConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: typia.random<
            string & tags.MinLength<5> & tags.MaxLength<10>
          >(),
          country: RandomGenerator.name(),
          is_default: true,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address);
  // ========== SETUP: Add Items to Cart ==========
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerLoginConnection,
      {
        body: {
          product_variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerLoginConnection,
      {
        body: {
          product_variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // ========== SETUP: Place Order ==========
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerLoginConnection,
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
  // ========== SETUP: Seller Creates Shipments ==========
  // Create first shipment with first order item
  const shipment1 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerLoginConnection,
      {
        body: {
          trackingNumber: typia.random<string & tags.MaxLength<50>>(),
          carrierName: RandomGenerator.pick([
            "FedEx",
            "UPS",
            "DHL",
            "Korea Post",
          ]),
          shippedAt: new Date().toISOString() satisfies string &
            tags.Format<"date-time">,
          orderItemIds: [order.order_items[0].id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  // Create second shipment with second order item (split shipment scenario)
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerLoginConnection,
      {
        body: {
          trackingNumber: typia.random<string & tags.MaxLength<50>>(),
          carrierName: RandomGenerator.pick([
            "FedEx",
            "UPS",
            "DHL",
            "Korea Post",
          ]),
          shippedAt: new Date().toISOString() satisfies string &
            tags.Format<"date-time">,
          orderItemIds: [order.order_items[1].id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  // ========== TEST: Customer Queries Shipments ==========
  const shipmentsResult =
    await api.functional.ecommerceMall.customer.orders.shipments.index(
      customerLoginConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          sortBy: "shipped_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(shipmentsResult);
  // ========== VALIDATION ==========
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    shipmentsResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    shipmentsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    shipmentsResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    shipmentsResult.pagination.pages >= 1,
  );
  // Verify shipment count matches expected
  TestValidator.equals(
    "shipment count matches order items",
    shipmentsResult.data.length,
    order.order_items.length,
  );
  // Verify each shipment has required tracking information
  for (const shipment of shipmentsResult.data) {
    typia.assert(shipment);
    TestValidator.predicate(
      "shipment has tracking number",
      shipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      "shipment has carrier name",
      shipment.carrier_name.length > 0,
    );
    TestValidator.predicate(
      "shipment has shipped timestamp",
      shipment.shipped_at.length > 0,
    );
    TestValidator.predicate(
      "shipment has seller info",
      shipment.seller !== null,
    );
    TestValidator.predicate(
      "shipment seller has shop name",
      shipment.seller.shop_name.length > 0,
    );
  }
  // Verify shipments are sorted by shipped_at descending
  const shippedAtValues = shipmentsResult.data.map((s) =>
    new Date(s.shipped_at).getTime(),
  );
  for (let i = 1; i < shippedAtValues.length; i++) {
    TestValidator.predicate(
      `shipments sorted descending at index ${i}`,
      shippedAtValues[i - 1] >= shippedAtValues[i],
    );
  }
  // ========== EDGE CASE: Test Filtering by Carrier ==========
  const carrierName = shipmentsResult.data[0].carrier_name;
  const filteredResult =
    await api.functional.ecommerceMall.customer.orders.shipments.index(
      customerLoginConnection,
      {
        orderId: order.id,
        body: {
          carrierName: carrierName.substring(
            0,
            Math.max(1, carrierName.length - 1),
          ), // Partial match
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredResult);
  TestValidator.predicate(
    "filter returns results",
    filteredResult.data.length > 0,
  );
  for (const shipment of filteredResult.data) {
    TestValidator.predicate(
      `filtered shipment matches carrier ${carrierName}`,
      shipment.carrier_name.includes(carrierName),
    );
  }
  // ========== EDGE CASE: Test Pagination ==========
  const page2Result =
    await api.functional.ecommerceMall.customer.orders.shipments.index(
      customerLoginConnection,
      {
        orderId: order.id,
        body: {
          page: 2,
          limit: 1,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 has correct limit",
    page2Result.pagination.limit === 1,
  );
}