import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test comment system health metrics retrieval for super administrators.
 * Validates that super administrators can access comment-specific performance
 * metrics including response times, success rates, and error rates with proper
 * health status classifications.
 */
export async function test_api_superadmin_comments_metrics_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Retrieve comment system health metrics
  const metric =
    await api.functional.discussionBoard.superAdmin.comments.metrics.at(
      superAdminConnection,
    );
  typia.assert(metric);
  // Validate metric structure and content
  TestValidator.predicate(
    "metric should have valid id",
    typeof metric.id === "string" && /^[0-9a-f-]{36}$/i.test(metric.id),
  );
  TestValidator.predicate(
    "metric should have valid metric_type",
    typeof metric.metric_type === "string" && metric.metric_type.length > 0,
  );
  TestValidator.predicate(
    "metric should have numeric metric_value",
    typeof metric.metric_value === "number" && !isNaN(metric.metric_value),
  );
  TestValidator.predicate(
    "metric should have valid unit",
    typeof metric.unit === "string" && metric.unit.length > 0,
  );
  TestValidator.predicate(
    "metric should have valid source_service",
    typeof metric.source_service === "string" &&
      metric.source_service.length > 0,
  );
  TestValidator.predicate(
    "metric should have valid status",
    typeof metric.status === "string" &&
      ["healthy", "warning", "critical"].includes(metric.status),
  );
  TestValidator.predicate(
    "metric should have valid collection_timestamp",
    !isNaN(new Date(metric.collection_timestamp).getTime()),
  );
  // Check if it's a comment-related metric type
  const commentMetricTypes = [
    "comment_response_time",
    "comment_success_rate",
    "comment_error_rate",
  ];
  TestValidator.predicate(
    "metric type should be comment-related",
    commentMetricTypes.includes(metric.metric_type),
  );
}
