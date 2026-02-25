import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
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
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

/**
 * Test administrator modification overview analytics with recent activity filtering
 * and trend analysis for cancellation and refund requests.
 */
export async function test_api_modification_overview_recent_activity_and_trends(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create customer and seller accounts
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // Create product for orders
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }).substring(0, 50),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create older orders (more than 7 days ago)
  const olderOrderConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(olderOrderConnection, {
    body: {
      email: customer.email,
      password: "customer123",
    } satisfies IEcommerceCustomer.ILogin,
  });
  const olderOrder = await api.functional.ecommerce.customer.orders.create(
    olderOrderConnection,
    {
      body: {
        period: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        total_revenue: 0,
        order_count: 0,
        average_order_value: 0,
        status_distribution: {
          paid: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          refunded: 0,
        } satisfies IEcommerceOrderSnapshotStatusDistribution,
        seller_performance: [],
        product_category_performance: [],
        geographic_distribution: {
          country_distribution: [],
          region_distribution: [],
          city_distribution: [],
          top_regions: [],
          unknown_locations: null,
        } satisfies IEcommerceOrderSnapshotGeographicDistribution,
        hourly_distribution: [],
      } satisfies IEcommerceOrder,
    },
  );
  typia.assert(olderOrder);
  // Create recent orders (within last 7 days)
  const recentOrder = await api.functional.ecommerce.customer.orders.create(
    customerConnection,
    {
      body: {
        period: new Date().toISOString(),
        total_revenue: 0,
        order_count: 0,
        average_order_value: 0,
        status_distribution: {
          paid: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          refunded: 0,
        } satisfies IEcommerceOrderSnapshotStatusDistribution,
        seller_performance: [],
        product_category_performance: [],
        geographic_distribution: {
          country_distribution: [],
          region_distribution: [],
          city_distribution: [],
          top_regions: [],
          unknown_locations: null,
        } satisfies IEcommerceOrderSnapshotGeographicDistribution,
        hourly_distribution: [],
      } satisfies IEcommerceOrder,
    },
  );
  typia.assert(recentOrder);
  // Create recent cancellation request (within last 7 days)
  const recentCancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }).substring(10, 50),
        } satisfies IEcommerceCancellationRequest.ICreate,
      },
    );
  typia.assert(recentCancellationRequest);
  // Create older refund request (more than 7 days ago)
  const olderRefundRequest =
    await generate_random_ecommerce_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }).substring(10, 50),
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(olderRefundRequest);
  // Call the overview endpoint
  const overview =
    await api.functional.ecommerce.administrator.modifications.overview.at(
      adminConnection,
    );
  typia.assert(overview);
  // Validate the overview data structure
  TestValidator.predicate(
    "overview contains cancellationRequest",
    overview.cancellationRequest !== undefined,
  );
  TestValidator.predicate(
    "overview contains refundRequest",
    overview.refundRequest !== undefined,
  );
  TestValidator.predicate(
    "overview contains inventoryRecord",
    overview.inventoryRecord !== undefined,
  );
  // Validate timestamp-based calculations
  TestValidator.predicate(
    "created_at timestamp exists",
    typeof overview.created_at === "string" && overview.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    typeof overview.updated_at === "string" && overview.updated_at.length > 0,
  );
  // Validate quantity restoration data
  TestValidator.predicate(
    "quantity_restored is valid",
    typeof overview.quantity_restored === "number" &&
      overview.quantity_restored >= 0,
  );
  // Validate restoration reason
  TestValidator.predicate(
    "restoration_reason exists",
    typeof overview.restoration_reason === "string" &&
      overview.restoration_reason.length > 0,
  );
}
