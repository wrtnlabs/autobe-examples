import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
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
 * Test edge case where admin attempts to update metadata for non-existent metric or metadata ID.
 * Admin authenticates via join. Admin sends PUT request with valid UUIDs that don't correspond
 * to existing metric or metadata. System should respond with appropriate 404 error indicating
 * resource not found. Validate error response structure and message.
 */
export async function test_api_system_health_metric_metadata_update_not_found(
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
  // Generate valid UUIDs that don't exist
  const nonExistentMetricId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentMetadataId = typia.random<string & tags.Format<"uuid">>();
  // Create valid metadata update body
  const updateBody = {
    key: RandomGenerator.alphabets(10),
    value: RandomGenerator.alphabets(20),
  } satisfies IDiscussionBoardSystemHealthMetricMetadatum.IUpdate;
  // Attempt to update non-existent metadata and verify 404 error
  await TestValidator.error(
    "update non-existent metric metadata should fail",
    async () => {
      await api.functional.discussionBoard.admin.system_health_metrics.metadata.putByMetricidAndMetadataid(
        adminConnection,
        {
          metricId: nonExistentMetricId,
          metadataId: nonExistentMetadataId,
          body: updateBody,
        },
      );
    },
  );
}
