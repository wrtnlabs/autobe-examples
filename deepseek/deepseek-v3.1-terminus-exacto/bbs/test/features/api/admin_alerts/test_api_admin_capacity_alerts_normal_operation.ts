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

export async function test_api_admin_capacity_alerts_normal_operation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Retrieve capacity alerts
  const capacityMetrics =
    await api.functional.discussionBoard.admin.alerts.capacity.at(
      adminConnection,
    );
  // Validate response structure
  typia.assert(capacityMetrics);
  // Validate metric properties
  TestValidator.predicate("has valid id", capacityMetrics.id.length > 0);
  TestValidator.predicate(
    "has metric type",
    capacityMetrics.metric_type.length > 0,
  );
  TestValidator.predicate(
    "has valid metric value",
    typeof capacityMetrics.metric_value === "number",
  );
  TestValidator.predicate("has unit", capacityMetrics.unit.length > 0);
  TestValidator.predicate(
    "has source service",
    capacityMetrics.source_service.length > 0,
  );
  TestValidator.predicate(
    "has collection timestamp",
    capacityMetrics.collection_timestamp.length > 0,
  );
  // Validate status is one of the expected values
  const validStatuses = ["healthy", "warning", "critical"] as const;
  TestValidator.predicate(
    "has valid status",
    validStatuses.includes(
      capacityMetrics.status as (typeof validStatuses)[number],
    ),
  );
}
