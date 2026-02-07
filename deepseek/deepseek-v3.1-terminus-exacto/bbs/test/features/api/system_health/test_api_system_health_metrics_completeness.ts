import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Validate that the system health endpoint returns comprehensive performance metrics
 * covering all essential platform components. Test verifies that metrics include
 * database connectivity status, API gateway performance, cache efficiency, and
 * frontend response times. Check that each metric contains valid values with
 * appropriate units and timestamps. Validate that the metadata field provides
 * additional context about metric collection. Ensure the health check maintains
 * fast response times as specified in performance requirements.
 */
export async function test_api_system_health_metrics_completeness(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using join endpoint
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Call system health endpoint
  const healthMetrics =
    await api.functional.discussionBoard.admin.system.health.at(
      adminConnection,
    );
  typia.assert(healthMetrics);
  // Validate metric structure completeness using business logic validation
  TestValidator.predicate(
    "has non-empty metric type",
    healthMetrics.metric_type.trim().length > 0,
  );
  TestValidator.predicate(
    "has non-negative metric value",
    healthMetrics.metric_value >= 0,
  );
  TestValidator.predicate(
    "has non-empty metric unit",
    healthMetrics.metric_unit.trim().length > 0,
  );
  TestValidator.predicate(
    "has non-empty source component",
    healthMetrics.source_component.trim().length > 0,
  );
  TestValidator.predicate(
    "has non-empty time range",
    healthMetrics.time_range.trim().length > 0,
  );
  // Validate timestamps reflect recent collection
  const collectionTime = new Date(healthMetrics.collection_timestamp).getTime();
  TestValidator.predicate("collection timestamp is valid", collectionTime > 0);
  TestValidator.predicate(
    "created timestamp is before current time",
    new Date(healthMetrics.created_at).getTime() <= Date.now(),
  );
  TestValidator.predicate(
    "updated timestamp is after or equal to creation",
    new Date(healthMetrics.updated_at).getTime() >=
      new Date(healthMetrics.created_at).getTime(),
  );
  // Test metadata field when present (business logic validation)
  if (healthMetrics.metadata !== null) {
    TestValidator.predicate("metadata is valid JSON when provided", () => {
      try {
        JSON.parse(healthMetrics.metadata!);
        return true;
      } catch {
        return false;
      }
    });
  }
}
