import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_performance_metrics_with_system_configuration(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
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
  typia.assert(adminAuth);
  // Update admin connection with authorization token
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Retrieve performance metric
  const metricId = typia.random<string & tags.Format<"uuid">>();
  const metric =
    await api.functional.discussionBoard.admin.performance_metrics.at(
      adminConnection,
      { metricId },
    );
  typia.assert(metric);
  // Validate the performance metric structure
  TestValidator.equals("metric ID matches", metric.id, metricId);
  // Validate optional systemConfiguration relationship
  if (metric.systemConfiguration !== null) {
    TestValidator.predicate(
      "systemConfiguration has valid structure",
      metric.systemConfiguration.config_key !== undefined &&
        metric.systemConfiguration.data_type !== undefined &&
        metric.systemConfiguration.category !== undefined &&
        metric.systemConfiguration.is_sensitive !== undefined,
    );
  }
}
