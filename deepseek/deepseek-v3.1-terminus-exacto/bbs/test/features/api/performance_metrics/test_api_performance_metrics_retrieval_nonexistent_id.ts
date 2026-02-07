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
 * Test the error handling when attempting to retrieve a performance metric with a non-existent ID.
 * This scenario validates that the system properly handles invalid metric IDs by returning a 404 error.
 * The test generates a valid but non-existent UUID and attempts to retrieve it, ensuring the system
 * correctly identifies that no such metric exists.
 */
export async function test_api_performance_metrics_retrieval_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Generate a valid but non-existent UUID
  const nonExistentMetricId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the performance metric with non-existent ID
  await TestValidator.error(
    "should return 404 for non-existent metric ID",
    async () => {
      await api.functional.discussionBoard.admin.performance_metrics.at(
        adminConnection,
        {
          metricId: nonExistentMetricId,
        },
      );
    },
  );
}
