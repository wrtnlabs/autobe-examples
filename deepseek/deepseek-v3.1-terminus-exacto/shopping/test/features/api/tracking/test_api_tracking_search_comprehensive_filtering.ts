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

export async function test_api_tracking_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller and create products
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product for tracking",
        base_price: 100,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 2. Setup customer and complete purchase flow
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create order via checkout
  const order = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    { body: { page: 1, limit: 10 } satisfies IEcommerceOrder.IRequest },
  );
  typia.assert(order);
  // 3. Seller creates shipments
  const shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          tracking_number: "TEST123456789",
          carrier_name: "Test Carrier",
          shipping_cost: 10,
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 4. Test comprehensive tracking search with various filters
  console.log("Testing comprehensive tracking search...");
  // Test 1: Search by exact tracking number
  const trackingSearch = await api.functional.ecommerce.customer.tracking.index(
    customerConnection,
    {
      body: {
        tracking_number: "TEST123456789",
      } satisfies IEcommerceShipment.IRequest,
    },
  );
  typia.assert(trackingSearch);
  TestValidator.equals(
    "tracking number search returns results",
    trackingSearch.data.length > 0,
    true,
  );
  // Test 2: Search by carrier name
  const carrierSearch = await api.functional.ecommerce.customer.tracking.index(
    customerConnection,
    {
      body: {
        carrier_name: "Test Carrier",
      } satisfies IEcommerceShipment.IRequest,
    },
  );
  typia.assert(carrierSearch);
  TestValidator.predicate(
    "carrier search returns results",
    carrierSearch.data.length > 0,
  );
  // Test 3: Search by shipment status
  const statusSearch = await api.functional.ecommerce.customer.tracking.index(
    customerConnection,
    {
      body: {
        shipment_status: "created",
      } satisfies IEcommerceShipment.IRequest,
    },
  );
  typia.assert(statusSearch);
  TestValidator.predicate(
    "status search returns results",
    statusSearch.data.length > 0,
  );
  // Test 4: Search with date range
  const dateSearch = await api.functional.ecommerce.customer.tracking.index(
    customerConnection,
    {
      body: {
        created_at_min: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        created_at_max: new Date().toISOString(),
      } satisfies IEcommerceShipment.IRequest,
    },
  );
  typia.assert(dateSearch);
  TestValidator.predicate(
    "date range search returns results",
    dateSearch.data.length > 0,
  );
  // Test 5: Search with pagination
  const paginationSearch =
    await api.functional.ecommerce.customer.tracking.index(customerConnection, {
      body: { page: 1, limit: 5 } satisfies IEcommerceShipment.IRequest,
    });
  typia.assert(paginationSearch);
  TestValidator.predicate(
    "pagination returns pagination metadata",
    paginationSearch.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination returns data",
    paginationSearch.data.length <= 5,
  );
  // Test 6: Empty search returns all authorized shipments
  const emptySearch = await api.functional.ecommerce.customer.tracking.index(
    customerConnection,
    { body: {} satisfies IEcommerceShipment.IRequest },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns authorized shipments",
    emptySearch.data.length > 0,
  );
  // Validate response structure contains essential tracking information
  if (trackingSearch.data.length > 0) {
    const firstShipment = trackingSearch.data[0];
    TestValidator.predicate(
      "shipment has tracking number",
      firstShipment.trackingNumber.length > 0,
    );
    TestValidator.predicate(
      "shipment has carrier name",
      firstShipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "shipment has status",
      firstShipment.shipmentStatus.length > 0,
    );
    TestValidator.predicate(
      "shipment has creation timestamp",
      firstShipment.createdAt.length > 0,
    );
    TestValidator.predicate(
      "shipment has seller info",
      firstShipment.seller !== undefined,
    );
  }
  console.log("All tracking search tests completed successfully");
}
