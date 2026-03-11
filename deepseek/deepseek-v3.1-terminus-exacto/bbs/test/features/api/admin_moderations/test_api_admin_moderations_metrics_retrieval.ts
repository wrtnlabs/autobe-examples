import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of system health metrics for administrative monitoring.
 * Verify that an authenticated administrator can access comprehensive performance
 * metrics including response times, success rates, error rates, connection health
 * scores, and resource utilization.
 */
export async function test_api_admin_moderations_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Retrieve system health metrics
  const metrics =
    await api.functional.discussionBoard.admin.moderations.metrics.at(
      adminConnection,
    );
  // Validate response structure - typia.assert performs complete validation
  typia.assert(metrics);
  // Verify metrics are sorted by collection timestamp descending (latest first)
  if (metrics.data.length > 1) {
    const timestamps = metrics.data.map((metric) =>
      new Date(metric.collection_timestamp).getTime(),
    );
    const isDescending = timestamps.every(
      (timestamp, index, array) => index === 0 || timestamp <= array[index - 1],
    );
    TestValidator.predicate(
      "metrics sorted by timestamp descending",
      isDescending,
    );
  }
}
