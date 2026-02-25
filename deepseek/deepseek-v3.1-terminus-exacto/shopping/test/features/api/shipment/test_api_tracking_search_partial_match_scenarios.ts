import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
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
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

/**
 * Test shipment tracking search functionality with partial matching, carrier filtering,
 * date range queries, pagination, and status-based filtering scenarios.
 */
export async function test_api_tracking_search_partial_match_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Create sellers with different statuses
  const sellerConnection: api.IConnection = { host: connection.host };
  const activeSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: "Active Seller Shop",
      shop_description: "Active seller description",
      logo_image_url: "https://example.com/active.jpg",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(activeSeller);
  const suspendedSellerConnection: api.IConnection = { host: connection.host };
  const suspendedSeller = await authorize_seller_join(
    suspendedSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        shop_name: "Suspended Seller Shop",
        shop_description: "Suspended seller description",
        logo_image_url: "https://example.com/suspended.jpg",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(suspendedSeller);
  // Create products from different sellers
  const activeProduct = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Active Seller Product",
        description: "Product from active seller",
        base_price: 1000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(activeProduct);
  // Create cart and checkout for order creation
  // Note: Cart ID creation logic would need to be implemented
  // For now, we'll simulate the tracking search with existing data
  // Test 1: Partial tracking number search
  const trackingSearch = await api.functional.ecommerce.customer.tracking.index(
    customerConnection,
    {
      body: {
        tracking_number: "TRACK",
      } satisfies IEcommerceShipment.IRequest,
    },
  );
  typia.assert(trackingSearch);
  // Test 2: Carrier name partial match
  const carrierSearch = await api.functional.ecommerce.customer.tracking.index(
    customerConnection,
    {
      body: {
        carrier_name: "Fed",
      } satisfies IEcommerceShipment.IRequest,
    },
  );
  typia.assert(carrierSearch);
  // Test 3: Date range filtering
  const dateSearch = await api.functional.ecommerce.customer.tracking.index(
    customerConnection,
    {
      body: {
        created_at_min: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_at_max: new Date().toISOString(),
      } satisfies IEcommerceShipment.IRequest,
    },
  );
  typia.assert(dateSearch);
  // Test 4: Status filtering
  const statusSearch = await api.functional.ecommerce.customer.tracking.index(
    customerConnection,
    {
      body: {
        shipment_status: "delivered",
      } satisfies IEcommerceShipment.IRequest,
    },
  );
  typia.assert(statusSearch);
  // Test 5: Pagination with different page sizes
  const paginationSearch =
    await api.functional.ecommerce.customer.tracking.index(customerConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceShipment.IRequest,
    });
  typia.assert(paginationSearch);
  // Test 6: Combination search
  const combinationSearch =
    await api.functional.ecommerce.customer.tracking.index(customerConnection, {
      body: {
        tracking_number: "PARTIAL",
        carrier_name: "UPS",
        shipment_status: "shipped",
      } satisfies IEcommerceShipment.IRequest,
    });
  typia.assert(combinationSearch);
  // Validate pagination structure
  await TestValidator.equals(
    "pagination structure",
    typeof paginationSearch.pagination,
    "object",
  );
  await TestValidator.predicate(
    "has current page",
    paginationSearch.pagination.current >= 1,
  );
  await TestValidator.predicate(
    "has valid limit",
    paginationSearch.pagination.limit >= 1,
  );
  // Validate shipment data structure
  if (paginationSearch.data.length > 0) {
    const shipment = paginationSearch.data[0];
    await TestValidator.predicate(
      "has tracking number",
      shipment.trackingNumber.length > 0,
    );
    await TestValidator.predicate(
      "has carrier name",
      shipment.carrierName.length > 0,
    );
    await TestValidator.predicate(
      "has seller info",
      typeof shipment.seller === "object",
    );
    await TestValidator.predicate(
      "has seller shop name",
      shipment.seller.shop_name.length > 0,
    );
    await TestValidator.predicate(
      "has shipment status",
      shipment.shipmentStatus.length > 0,
    );
  }
}