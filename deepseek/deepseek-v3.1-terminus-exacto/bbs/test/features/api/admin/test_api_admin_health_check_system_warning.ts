import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_health_check_system_warning(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Call health check endpoint
  const healthMetrics =
    await api.functional.discussionBoard.admin.health.at(adminConnection);
  typia.assert(healthMetrics);
  // Validate that the response follows the 'weakest link' principle with warning status
  TestValidator.predicate(
    "health check should report warning status for degraded system",
    healthMetrics.status === "warning",
  );
  // Verify that the metric contains necessary information for administrators
  TestValidator.predicate(
    "metric should have valid metric type",
    healthMetrics.metric_type.length > 0,
  );
  TestValidator.predicate(
    "metric should have valid source service",
    healthMetrics.source_service.length > 0,
  );
  TestValidator.predicate(
    "metric should have valid unit",
    healthMetrics.unit.length > 0,
  );
  // Validate that the metric value is within reasonable bounds for a warning scenario
  TestValidator.predicate(
    "metric value should be a reasonable number",
    healthMetrics.metric_value >= 0,
  );
}
