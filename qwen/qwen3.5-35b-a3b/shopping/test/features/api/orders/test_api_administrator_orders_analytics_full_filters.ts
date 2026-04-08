import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_orders_analytics_full_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Generate filter parameters
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  const statusList: Array<
    "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
  > = ["paid", "shipped", "delivered"];
  const paginationParams = {
    page: 1 as const,
    limit: 20 as const,
  };
  const sortBy: "created_at" | "total_price" = "created_at";
  const sortOrder: "asc" | "desc" = "desc";
  // 4. Request analytics with full filters
  const analyticsResponse =
    await api.functional.ecommerceMall.administrator.orders.analytics.index(
      adminAuthConnection,
      {
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          statuses: statusList,
          page: paginationParams.page,
          limit: paginationParams.limit,
          sort_by: sortBy,
          sort_order: sortOrder,
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    analyticsResponse.pagination.current,
    paginationParams.page,
  );
  TestValidator.equals(
    "pagination limit",
    analyticsResponse.pagination.limit,
    paginationParams.limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    analyticsResponse.pagination.pages >= 0,
  );
  // 6. Validate analytics summary structure
  if (analyticsResponse.data.length > 0) {
    const summary = analyticsResponse.data[0];
    typia.assert(summary);
    TestValidator.predicate(
      "totalOrderCount non-negative",
      summary.totalOrderCount >= 0,
    );
    TestValidator.predicate(
      "totalRevenue non-negative",
      summary.totalRevenue >= 0,
    );
    TestValidator.predicate(
      "averageOrderValue non-negative",
      summary.averageOrderValue >= 0,
    );
    // 7. Validate average order value calculation
    if (summary.totalOrderCount > 0) {
      const expectedAOV = summary.totalRevenue / summary.totalOrderCount;
      TestValidator.equals(
        "averageOrderValue calculation",
        summary.averageOrderValue,
        expectedAOV,
      );
    } else {
      TestValidator.equals(
        "averageOrderValue when no orders",
        summary.averageOrderValue,
        0,
      );
    }
    // 8. Validate status breakdown exists
    TestValidator.predicate(
      "statusBreakdown is object",
      typeof summary.statusBreakdown === "object" &&
        summary.statusBreakdown !== null,
    );
    // 9. Validate topSellers array structure
    TestValidator.predicate(
      "topSellers is array",
      Array.isArray(summary.topSellers),
    );
    if (summary.topSellers.length > 0) {
      const seller = summary.topSellers[0];
      typia.assert(seller);
      TestValidator.predicate(
        "seller ID is string",
        typeof seller.id === "string" && seller.id.length > 0,
      );
      TestValidator.predicate(
        "seller has display_name",
        seller.display_name.length > 0,
      );
      TestValidator.predicate(
        "seller approval_status string",
        typeof seller.approval_status === "string",
      );
      TestValidator.predicate(
        "seller is_suspended boolean",
        typeof seller.is_suspended === "boolean",
      );
    }
    // 10. Validate topProducts array structure
    TestValidator.predicate(
      "topProducts is array",
      Array.isArray(summary.topProducts),
    );
    if (summary.topProducts.length > 0) {
      const product = summary.topProducts[0];
      typia.assert(product);
      TestValidator.predicate(
        "product ID is string",
        typeof product.id === "string" && product.id.length > 0,
      );
      TestValidator.predicate("product has name", product.name.length > 0);
      TestValidator.predicate(
        "product base_price non-negative",
        product.base_price >= 0,
      );
      TestValidator.predicate(
        "product category is object",
        typeof product.category === "object" && product.category !== null,
      );
      TestValidator.predicate(
        "product seller is object",
        typeof product.seller === "object" && product.seller !== null,
      );
      TestValidator.predicate(
        "product availability_status enum",
        ["available", "unavailable"].includes(product.availability_status),
      );
    }
  }
}
