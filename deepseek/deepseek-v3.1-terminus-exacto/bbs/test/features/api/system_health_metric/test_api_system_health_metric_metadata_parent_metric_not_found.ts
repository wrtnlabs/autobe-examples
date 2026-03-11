import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_health_metrics_metadata_create } from "../../../generate/generate_random_discussion_board_super_admin_system_health_metrics_metadata_create";
import { prepare_random_discussion_board_system_health_metric_metadatum } from "../../../prepare/prepare_random_discussion_board_system_health_metric_metadatum";

/**
 * Test scenario where parent system health metric does not exist.
 * SuperAdmin authenticates, provides a non-existent or deleted metricId in path parameter.
 * Validate that the system returns 404 Not Found error with appropriate message
 * indicating the parent metric cannot be found or has been deleted.
 * Verify that no metadata record is created for non-existent parent.
 * Test error response provides clear guidance about the missing parent metric.
 * This ensures proper validation of parent-child relationship exists before metadata creation.
 */
export async function test_api_system_health_metric_metadata_parent_metric_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Generate a non-existent metric ID
  const nonExistentMetricId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare valid metadata body
  const body = {
    key: RandomGenerator.alphabets(10),
    value: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate;
  // 4. Attempt to create metadata for non-existent parent metric
  await TestValidator.httpError(
    "should return 404 when parent metric not found",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.system_health_metrics.metadata.create(
        superAdminConnection,
        {
          metricId: nonExistentMetricId,
          body,
        },
      );
    },
  );
}
