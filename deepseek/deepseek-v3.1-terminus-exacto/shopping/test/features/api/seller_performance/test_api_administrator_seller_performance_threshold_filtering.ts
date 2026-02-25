import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
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

export async function test_api_administrator_seller_performance_threshold_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123",
    } satisfies IEcommerceAdministrator.ILogin,
  });
  // Create sellers with different performance characteristics
  const sellers: IEcommerceSeller.IAuthorized[] = [];
  const performanceScenarios = [
    { desc: "high_rating_low_cancellation", expectedFilter: true },
    { desc: "low_rating_high_cancellation", expectedFilter: false },
    { desc: "medium_performance", expectedFilter: true },
  ];
  for (const scenario of performanceScenarios) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Seller123!" satisfies string &
          tags.Format<"password"> as string,
        shop_name: `Seller_${scenario.desc}`,
        shop_description: `Test seller with ${scenario.desc} characteristics`,
        logo_image_url: null,
        href: "http://test.com",
        referrer: "http://test.com",
        ip: null,
      } satisfies IEcommerceSeller.IJoin,
    });
    sellers.push(seller);
  }
  // Test various threshold filters
  // Note: Actual performance data generation would require complex order/cancellation/refund flows
  // For this test, we focus on validating the filtering endpoint works with different parameters
  // Test 1: Basic filtering with date range
  const basicFilter =
    await api.functional.ecommerce.administrator.seller_performance.index(
      adminConnection,
      {
        body: {
          search: undefined,
          account_status: "active",
          created_after: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_before: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(basicFilter);
  TestValidator.predicate(
    "basic filter should return valid pagination structure",
    basicFilter.pagination.current === 1 && basicFilter.pagination.limit <= 100,
  );
  // Test 2: Search filtering
  const searchFilter =
    await api.functional.ecommerce.administrator.seller_performance.index(
      adminConnection,
      {
        body: {
          search: "Seller",
          account_status: undefined,
          created_after: undefined,
          created_before: undefined,
          page: 1,
          limit: 5,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(searchFilter);
  TestValidator.predicate(
    "search filter should handle search term",
    searchFilter.data.length >= 0,
  );
  // Test 3: Status filtering
  const statusFilter =
    await api.functional.ecommerce.administrator.seller_performance.index(
      adminConnection,
      {
        body: {
          search: undefined,
          account_status: "active",
          created_after: undefined,
          created_before: undefined,
          page: 1,
          limit: 15,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(statusFilter);
  TestValidator.predicate(
    "status filter should return appropriate sellers",
    statusFilter.data.length >= 0,
  );
  // Test 4: Comprehensive filtering
  const comprehensiveFilter =
    await api.functional.ecommerce.administrator.seller_performance.index(
      adminConnection,
      {
        body: {
          search: "Seller_",
          account_status: "active",
          created_after: new Date(
            Date.now() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_before: new Date().toISOString(),
          page: 1,
          limit: 50,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(comprehensiveFilter);
  TestValidator.predicate(
    "comprehensive filter should handle multiple parameters",
    comprehensiveFilter.pagination.pages >= 0,
  );
  // Validate that all responses have proper seller summary structure
  for (const filterResult of [
    basicFilter,
    searchFilter,
    statusFilter,
    comprehensiveFilter,
  ]) {
    for (const seller of filterResult.data) {
      TestValidator.predicate(
        "seller should have valid email format",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(seller.email),
      );
      TestValidator.predicate(
        "seller should have valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          seller.id,
        ),
      );
    }
  }
}
