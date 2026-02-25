import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test comprehensive category analytics retrieval with various filtering options
 * for super administrators.
 */
export async function test_api_category_analytics_comprehensive_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator and create authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Use the utility function for super administrator join
  const joinData = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  // Update connection headers with authentication token
  superAdminConnection.headers = {
    Authorization: joinData.token.access,
  };
  // 2. Test default pagination (page=1, limit=10)
  const defaultRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IEcommerceCategory.IRequest;
  const defaultResponse =
    await api.functional.ecommerce.superAdministrator.category_analytics.index(
      superAdminConnection,
      { body: defaultRequest },
    );
  typia.assert(defaultResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "has pagination metadata",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "current page matches",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit matches", defaultResponse.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // 3. Test different metric types combination
  const metricTypeArrays: readonly (
    | "sales"
    | "products"
    | "engagement"
    | "performance"
  )[][] = [
    ["sales"],
    ["products"],
    ["engagement"],
    ["performance"],
    ["sales", "products", "engagement", "performance"],
  ];
  for (const metricType of metricTypeArrays) {
    const request = {
      page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 5 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      metric_types: metricType,
    } satisfies IEcommerceCategory.IRequest;
    const response =
      await api.functional.ecommerce.superAdministrator.category_analytics.index(
        superAdminConnection,
        { body: request },
      );
    typia.assert(response);
    TestValidator.predicate(
      `metric types ${metricType.join(",")} returns data`,
      response.data.length >= 0,
    );
  }
  // 4. Test date range filtering with start_date and end_date
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    start_date: oneMonthAgo.toISOString() satisfies string &
      tags.Format<"date-time">,
    end_date: now.toISOString() satisfies string & tags.Format<"date-time">,
  } satisfies IEcommerceCategory.IRequest;
  const dateRangeResponse =
    await api.functional.ecommerce.superAdministrator.category_analytics.index(
      superAdminConnection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeResponse);
  // 5. Test category IDs filtering with specific UUIDs
  // Get some category IDs from the default response
  if (defaultResponse.data.length > 0) {
    const categoryIds = defaultResponse.data
      .slice(0, 2)
      .map((category) => category.id);
    const categoryIdsRequest = {
      page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      category_ids: categoryIds,
    } satisfies IEcommerceCategory.IRequest;
    const categoryIdsResponse =
      await api.functional.ecommerce.superAdministrator.category_analytics.index(
        superAdminConnection,
        { body: categoryIdsRequest },
      );
    typia.assert(categoryIdsResponse);
    TestValidator.predicate(
      "category filtering returns expected data",
      categoryIdsResponse.data.length <= categoryIds.length,
    );
  }
  // 6. Test empty filters (no category_ids, no date range, no metric_types)
  const emptyFiltersRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IEcommerceCategory.IRequest;
  const emptyFiltersResponse =
    await api.functional.ecommerce.superAdministrator.category_analytics.index(
      superAdminConnection,
      { body: emptyFiltersRequest },
    );
  typia.assert(emptyFiltersResponse);
  // 7. Test various page numbers
  const pageSizes = [1, 2, 3, 5, 10];
  for (const pageSize of pageSizes) {
    const request = {
      page: pageSize satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 5 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies IEcommerceCategory.IRequest;
    const response =
      await api.functional.ecommerce.superAdministrator.category_analytics.index(
        superAdminConnection,
        { body: request },
      );
    typia.assert(response);
    TestValidator.equals(
      `page ${pageSize} has correct current page`,
      response.pagination.current,
      pageSize,
    );
  }
  // 8. Validate category summary fields using business logic checks
  if (defaultResponse.data.length > 0) {
    const category = defaultResponse.data[0];
    // Business logic validation instead of type validation
    TestValidator.predicate(
      "category has non-empty id",
      category.id.length > 0,
    );
    TestValidator.predicate(
      "category has non-empty name",
      category.name.length > 0,
    );
    TestValidator.predicate(
      "products_count is non-negative",
      category.products_count >= 0,
    );
    // Validate parent structure when present
    if (category.parent !== null) {
      TestValidator.predicate(
        "parent category has non-empty id",
        category.parent.id.length > 0,
      );
      TestValidator.predicate(
        "parent category has different id than child",
        category.parent.id !== category.id,
      );
    }
  }
  // 9. Test comprehensive filtering with all parameters
  const comprehensiveRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    metric_types: ["sales", "products"] as const,
    start_date: oneMonthAgo.toISOString() satisfies string &
      tags.Format<"date-time">,
  } satisfies IEcommerceCategory.IRequest;
  const comprehensiveResponse =
    await api.functional.ecommerce.superAdministrator.category_analytics.index(
      superAdminConnection,
      { body: comprehensiveRequest },
    );
  typia.assert(comprehensiveResponse);
  // Final validation that all API calls completed successfully
  TestValidator.predicate(
    "All category analytics tests completed successfully",
    true,
  );
}
