import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_error_logs_analytics_component_specific(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate test data for analytics request
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString(); // current time
  // Test with specific component filter
  const analyticsRequest = {
    start_date: startDate,
    end_date: endDate,
    error_type: "database_error",
    severity: "error",
    component: "database",
    environment: "production",
  } satisfies IDiscussionBoardErrorLog.IAnalyticsRequest;
  // Call the analytics endpoint
  const analyticsResult =
    await api.functional.discussionBoard.admin.error_logs.analytics.index(
      adminConnection,
      { body: analyticsRequest },
    );
  // Validate the response structure
  typia.assert(analyticsResult);
  // Test business logic validations
  TestValidator.predicate(
    "response has pagination",
    analyticsResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(analyticsResult.data),
  );
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    typeof analyticsResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof analyticsResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof analyticsResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof analyticsResult.pagination.pages === "number",
  );
  // Validate component-specific filtering if data exists
  if (analyticsResult.data.length > 0) {
    const firstItem = analyticsResult.data[0];
    TestValidator.equals(
      "component matches filter",
      firstItem.component,
      "database",
    );
    TestValidator.equals(
      "error_type matches filter",
      firstItem.error_type,
      "database_error",
    );
    TestValidator.equals(
      "severity matches filter",
      firstItem.severity,
      "error",
    );
    TestValidator.equals(
      "environment matches filter",
      firstItem.environment,
      "production",
    );
    // Validate analytics summary properties
    TestValidator.predicate(
      "has error_count",
      typeof firstItem.error_count === "number",
    );
    TestValidator.predicate(
      "has average_occurrence_rate",
      typeof firstItem.average_occurrence_rate === "number",
    );
    TestValidator.predicate(
      "has trend_direction",
      ["increasing", "decreasing", "stable"].includes(
        firstItem.trend_direction,
      ),
    );
    TestValidator.predicate(
      "has first_occurrence",
      typeof firstItem.first_occurrence === "string",
    );
    TestValidator.predicate(
      "has last_occurrence",
      typeof firstItem.last_occurrence === "string",
    );
  }
}
