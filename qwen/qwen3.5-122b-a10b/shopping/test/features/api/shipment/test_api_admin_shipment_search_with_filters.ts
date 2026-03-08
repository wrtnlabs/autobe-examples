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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_admin_shipment_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create first seller and login
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  // 3. Create second seller and login
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller2Auth);
  // 4. Create customer and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 5. Create products for both sellers (utility generates valid data including category)
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {},
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller2Connection,
    {},
  );
  typia.assert(product2);
  // 6. Create variants for products (utility generates valid data)
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
        body: {},
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller2Connection,
      {
        params: { productId: product2.id },
        body: {},
      },
    );
  typia.assert(variant2);
  // 7. Add items to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant1.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant2.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 8. Create orders (utility generates valid data)
  const order1 = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order1);
  // 9. Create shipments for both orders from different sellers
  const shipment1 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      seller1Connection,
      {
        body: {
          trackingNumber: `TRACK001-${RandomGenerator.alphaNumeric(8)}`,
          carrierName: "FedEx",
          shippedAt: new Date().toISOString(),
          orderItemIds: [order1.order_items[0].id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      seller2Connection,
      {
        body: {
          trackingNumber: `TRACK002-${RandomGenerator.alphaNumeric(8)}`,
          carrierName: "UPS",
          shippedAt: new Date().toISOString(),
          orderItemIds: [order1.order_items[1].id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  // 10. Test 1: Search by tracking number (partial match)
  const searchByTracking =
    await api.functional.ecommerceMall.admin.shipments.search(adminConnection, {
      body: {
        trackingNumber: "TRACK001",
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchByTracking);
  TestValidator.equals(
    "tracking number search returns matching shipment",
    searchByTracking.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "tracking number search result contains correct tracking",
    searchByTracking.data.some((s) => s.tracking_number.includes("TRACK001")),
  );
  // 11. Test 2: Search by carrier name (partial match)
  const searchByCarrier =
    await api.functional.ecommerceMall.admin.shipments.search(adminConnection, {
      body: {
        carrierName: "Fed",
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchByCarrier);
  TestValidator.equals(
    "carrier name search returns matching shipment",
    searchByCarrier.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "carrier name search result contains correct carrier",
    searchByCarrier.data.some((s) =>
      s.carrier_name.toLowerCase().includes("fed"),
    ),
  );
  // 12. Test 3: Filter by seller ID
  const searchBySeller =
    await api.functional.ecommerceMall.admin.shipments.search(adminConnection, {
      body: {
        sellerId: seller1Auth.seller.id,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchBySeller);
  TestValidator.equals(
    "seller ID filter returns correct shipments",
    searchBySeller.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "seller ID filter result contains correct seller",
    searchBySeller.data.every((s) => s.seller.id === seller1Auth.seller.id),
  );
  // 13. Test 4: Filter by order number
  const searchByOrder =
    await api.functional.ecommerceMall.admin.shipments.search(adminConnection, {
      body: {
        orderNumber: order1.order_number,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchByOrder);
  TestValidator.equals(
    "order number filter returns shipments for that order",
    searchByOrder.data.length > 0,
    true,
  );
  // 14. Test 5: Filter by shipped date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const searchByDateRange =
    await api.functional.ecommerceMall.admin.shipments.search(adminConnection, {
      body: {
        shippedAtFrom: yesterday.toISOString(),
        shippedAtTo: tomorrow.toISOString(),
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchByDateRange);
  TestValidator.equals(
    "shipped date range filter returns shipments in range",
    searchByDateRange.data.length > 0,
    true,
  );
  // 15. Test 6: Pagination
  const paginatedSearch =
    await api.functional.ecommerceMall.admin.shipments.search(adminConnection, {
      body: {
        page: 1,
        limit: 1,
        sortBy: "shipped_at",
        sortOrder: "desc",
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination returns 1 record",
    paginatedSearch.data.length,
    1,
  );
  TestValidator.equals(
    "pagination metadata has correct page",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination metadata has correct limit",
    paginatedSearch.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination metadata has total records",
    paginatedSearch.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination metadata has total pages",
    paginatedSearch.pagination.pages > 0,
  );
  // 16. Test 7: Verify shipment summary structure
  TestValidator.predicate(
    "shipment summary has tracking_number",
    paginatedSearch.data[0].tracking_number !== undefined,
  );
  TestValidator.predicate(
    "shipment summary has carrier_name",
    paginatedSearch.data[0].carrier_name !== undefined,
  );
  TestValidator.predicate(
    "shipment summary has shipped_at",
    paginatedSearch.data[0].shipped_at !== undefined,
  );
  TestValidator.predicate(
    "shipment summary has seller",
    paginatedSearch.data[0].seller !== undefined,
  );
  TestValidator.predicate(
    "shipment summary has seller id",
    paginatedSearch.data[0].seller.id !== undefined,
  );
  TestValidator.predicate(
    "shipment summary has seller shop_name",
    paginatedSearch.data[0].seller.shop_name !== undefined,
  );
}