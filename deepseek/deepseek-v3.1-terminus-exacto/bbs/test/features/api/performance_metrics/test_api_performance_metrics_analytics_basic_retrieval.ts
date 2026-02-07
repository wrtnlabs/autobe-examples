import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the basic functionality of retrieving performance metrics with default parameters.
 * This scenario validates that administrators can access system performance data for platform health monitoring.
 * The test should verify that the endpoint returns paginated results with valid performance metrics
 * including response times, CPU usage, memory usage, error rates, and request counts.
 * Validate that the response structure matches the expected schema with pagination metadata
 * and performance metric summaries. Ensure that only administrators can access this sensitive
 * system performance data by verifying proper authorization checks.
 */
export async function test_api_performance_metrics_analytics_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using join utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Validate authorization was successful
  typia.assert(adminAuth);
  // Call performance metrics analytics endpoint with minimal/default parameters
  const response =
    await api.functional.discussionBoard.admin.performance_metrics.analytics.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  // Validate response structure - this performs complete type validation
  typia.assert(response);
  // Test that unauthorized access fails
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.discussionBoard.admin.performance_metrics.analytics.index(
      { host: connection.host }, // Unauthorized connection
      {
        body: {} satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  });
}
