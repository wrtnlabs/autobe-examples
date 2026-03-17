import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test system metrics retrieval with empty or no filters to get comprehensive platform overview.
 * As an admin, access metrics without specifying filters to get all available data across all components.
 * Verify response includes diverse metric types across authentication, communities, posts, comments,
 * votes, subscriptions, and moderation components. Validate pagination works correctly with total
 * records count and page navigation. Ensure each metric record includes required fields: id,
 * component, metric_name, aggregation_period, period_start, period_end, metric_value, value_type,
 * created_at. Check optional fields dimensions and notes are present where applicable.
 */
export async function test_api_system_metrics_admin_comprehensive_overview(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  const auth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(auth);
  // 1. Test retrieving system metrics with empty filters (comprehensive overview)
  const firstPage = await api.functional.communityPlatform.admin.metrics.index(
    adminConnection,
    {
      body: {} satisfies ICommunityPlatformSystemMetric.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    firstPage.pagination !== undefined,
  );
  TestValidator.equals("current page", firstPage.pagination.current, 1);
  TestValidator.predicate("limit positive", firstPage.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Validate data structure and required fields for each metric
  for (const metric of firstPage.data) {
    typia.assert(metric);
    // Check required fields
    TestValidator.predicate(
      "has id",
      metric.id !== undefined && metric.id.length > 0,
    );
    TestValidator.predicate(
      "has component",
      metric.component !== undefined && metric.component.length > 0,
    );
    TestValidator.predicate(
      "has metric_name",
      metric.metric_name !== undefined && metric.metric_name.length > 0,
    );
    TestValidator.predicate(
      "has aggregation_period",
      metric.aggregation_period !== undefined &&
        metric.aggregation_period.length > 0,
    );
    TestValidator.predicate(
      "has period_start",
      metric.period_start !== undefined && metric.period_start.length > 0,
    );
    TestValidator.predicate(
      "has period_end",
      metric.period_end !== undefined && metric.period_end.length > 0,
    );
    TestValidator.predicate(
      "has metric_value",
      typeof metric.metric_value === "number",
    );
    TestValidator.predicate(
      "has value_type",
      metric.value_type !== undefined && metric.value_type.length > 0,
    );
    TestValidator.predicate(
      "has created_at",
      metric.created_at !== undefined && metric.created_at.length > 0,
    );
    // Check optional fields exist (they may be null, undefined, or string)
    TestValidator.predicate(
      "dimensions exists as property",
      "dimensions" in metric,
    );
    TestValidator.predicate("notes exists as property", "notes" in metric);
  }
  // 2. Test pagination navigation if there are multiple pages
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.communityPlatform.admin.metrics.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: firstPage.pagination.limit,
          } satisfies ICommunityPlatformSystemMetric.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page number",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "consistent limit",
      secondPage.pagination.limit,
      firstPage.pagination.limit,
    );
    TestValidator.equals(
      "consistent total records",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    // Ensure different data on different pages
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.notEquals(
        "different page data",
        firstPage.data[0].id,
        secondPage.data[0].id,
      );
    }
  }
  // 3. Test with specific limit to verify pagination works
  const limitedPage =
    await api.functional.communityPlatform.admin.metrics.index(
      adminConnection,
      {
        body: {
          limit: 5,
        } satisfies ICommunityPlatformSystemMetric.IRequest,
      },
    );
  typia.assert(limitedPage);
  TestValidator.equals("limit applied", limitedPage.pagination.limit, 5);
  TestValidator.predicate("data length <= limit", limitedPage.data.length <= 5);
  // 4. Verify data includes diverse components (if data exists)
  if (firstPage.data.length > 0) {
    const components = new Set(firstPage.data.map((m) => m.component));
    const expectedComponents = [
      "auth",
      "communities",
      "posts",
      "comments",
      "votes",
      "subscriptions",
      "moderation",
    ];
    // Check at least some of the expected components are present
    const foundComponents = Array.from(components).filter((c) =>
      expectedComponents.some((ec) =>
        c.toLowerCase().includes(ec.toLowerCase()),
      ),
    );
    TestValidator.predicate(
      "contains expected components",
      foundComponents.length > 0,
    );
  }
}
