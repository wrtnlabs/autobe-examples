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
 * Test the real-time monitoring capabilities of the system health endpoint.
 * Verifies that collection_timestamp reflects recent data collection and
 * health metrics provide accurate snapshots of current system performance.
 */
export async function test_api_system_health_real_time_monitoring(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
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
  // Verify collection timestamp is recent (within last 5 minutes)
  const collectionTime = new Date(healthMetrics.collection_timestamp);
  const currentTime = new Date();
  const timeDiff = currentTime.getTime() - collectionTime.getTime();
  TestValidator.predicate(
    "collection timestamp is recent",
    timeDiff <= 5 * 60 * 1000,
  );
  // Validate metric value is non-negative
  TestValidator.predicate(
    "metric value is non-negative",
    healthMetrics.metric_value >= 0,
  );
}
