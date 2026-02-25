import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_history_pagination_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Create multiple orders - enough to span multiple pages
  const totalOrders = 25; // Enough to test multiple pages with different limits
  const orders: IEcommerceOrder.ISummary[] = [];
  for (let i = 0; i < totalOrders; i++) {
    const orderResponse = await api.functional.ecommerce.customer.orders.create(
      customerConnection,
      {
        body: {
          period: new Date().toISOString(),
          total_revenue: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
          order_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          average_order_value: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<10000>
          >(),
          status_distribution: {
            paid: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            shipped: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<3>
            >(),
            delivered: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<2>
            >(),
            cancelled: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1>
            >(),
            refunded: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1>
            >(),
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
    typia.assert(orderResponse);
    
    // Create summary object with proper entity properties
    const orderSummary: IEcommerceOrder.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      customer: {
        id: customer.id,
        email: customer.email,
        display_name: customer.display_name,
        created_at: customer.created_at,
      } satisfies IEcommerceCustomer.ISummary,
    };
    
    orders.push(orderSummary);
  }
  // Test pagination with different limit values
  const testLimits = [5, 10, 25]; // Test various page sizes
  for (const limit of testLimits) {
    // Test first page
    const firstPage =
      await api.functional.ecommerce.customer.orders.history.index(
        customerConnection,
        {
          body: {
            page: 1,
            limit: limit satisfies number as number,
          } satisfies IEcommerceOrder.IRequest,
        },
      );
    typia.assert(firstPage);
    TestValidator.equals(
      "first page pagination current",
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "first page pagination limit",
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "total records matches created orders",
      firstPage.pagination.records,
      totalOrders,
    );
    TestValidator.predicate(
      "calculated pages is correct",
      firstPage.pagination.pages === Math.ceil(totalOrders / limit),
    );
    TestValidator.predicate(
      "first page data count matches limit",
      firstPage.data.length === Math.min(limit, totalOrders),
    );
    // Test middle page
    const middlePageNumber = Math.floor(firstPage.pagination.pages / 2);
    if (middlePageNumber > 1) {
      const middlePage =
        await api.functional.ecommerce.customer.orders.history.index(
          customerConnection,
          {
            body: {
              page: middlePageNumber,
              limit: limit satisfies number as number,
            } satisfies IEcommerceOrder.IRequest,
          },
        );
      typia.assert(middlePage);
      TestValidator.equals(
        "middle page pagination current",
        middlePage.pagination.current,
        middlePageNumber,
      );
      TestValidator.predicate(
        "middle page data count reasonable",
        middlePage.data.length > 0 && middlePage.data.length <= limit,
      );
    }
    // Test last page
    const lastPage =
      await api.functional.ecommerce.customer.orders.history.index(
        customerConnection,
        {
          body: {
            page: firstPage.pagination.pages,
            limit: limit satisfies number as number,
          } satisfies IEcommerceOrder.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page pagination current",
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );
    TestValidator.predicate(
      "last page has remaining items",
      lastPage.data.length > 0 && lastPage.data.length <= limit,
    );
    TestValidator.predicate(
      "last page item count equals remainder",
      lastPage.data.length === totalOrders % limit ||
        lastPage.data.length === limit,
    );
  }
  // Test edge cases
  // Test page beyond available data
  const largePage =
    await api.functional.ecommerce.customer.orders.history.index(
      customerConnection,
      {
        body: {
          page: 100, // Far beyond reasonable pages
          limit: 10 satisfies number as number,
        } satisfies IEcommerceOrder.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.predicate(
    "page beyond data returns empty array",
    largePage.data.length === 0,
  );
  // Test minimum limit
  const minLimit = await api.functional.ecommerce.customer.orders.history.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 1 satisfies number as number,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(minLimit);
  TestValidator.equals(
    "minimum limit returns single item",
    minLimit.data.length,
    1,
  );
  // Test maximum limit
  const maxLimit = await api.functional.ecommerce.customer.orders.history.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100 satisfies number as number,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "maximum limit returns all items",
    maxLimit.data.length >= totalOrders,
  );
  // Test without pagination parameters (default behavior)
  const defaultPage =
    await api.functional.ecommerce.customer.orders.history.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceOrder.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page has reasonable data count",
    defaultPage.data.length > 0 &&
      defaultPage.data.length <= defaultPage.pagination.limit,
  );
}