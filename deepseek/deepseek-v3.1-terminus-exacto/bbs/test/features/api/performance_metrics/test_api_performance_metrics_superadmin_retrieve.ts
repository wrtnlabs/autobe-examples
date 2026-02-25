import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_performance_metrics_superadmin_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a valid metric ID for retrieval
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve performance metric details
  const metric =
    await api.functional.discussionBoard.superAdmin.performance_metrics.at(
      superAdminConnection,
      { metricId },
    );
  // Validate complete response structure
  typia.assert(metric);
  // Business logic validation - confirm all expected fields present
  TestValidator.equals("metric ID matches request", metric.id, metricId);
  TestValidator.predicate(
    "metric type is string",
    typeof metric.metric_type === "string",
  );
  TestValidator.predicate(
    "metric value is number",
    typeof metric.metric_value === "number",
  );
  TestValidator.predicate(
    "metric unit is string",
    typeof metric.metric_unit === "string",
  );
  TestValidator.predicate(
    "source component is string",
    typeof metric.source_component === "string",
  );
  TestValidator.predicate(
    "collection timestamp is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(metric.collection_timestamp),
  );
  TestValidator.predicate(
    "time range is string",
    typeof metric.time_range === "string",
  );
  TestValidator.predicate(
    "metadata is string or null",
    metric.metadata === null || typeof metric.metadata === "string",
  );
  TestValidator.predicate(
    "created at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(metric.created_at),
  );
  TestValidator.predicate(
    "updated at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(metric.updated_at),
  );
  TestValidator.predicate(
    "systemConfiguration is summary or null",
    metric.systemConfiguration === null ||
      (typeof metric.systemConfiguration === "object" &&
        typeof metric.systemConfiguration.config_key === "string" &&
        typeof metric.systemConfiguration.data_type === "string" &&
        typeof metric.systemConfiguration.category === "string" &&
        typeof metric.systemConfiguration.is_sensitive === "boolean"),
  );
}
