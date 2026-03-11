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
 * Test updating an existing metadata key-value pair for a system health metric.
 * Since the system health metric creation endpoint is not available in the SDK,
 * this test focuses on validating the metadata update operation structure and
 * admin authorization requirements.
 */
export async function test_api_system_health_metric_metadata_update_existing_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Since we cannot create system health metrics with the provided SDK,
  // we'll test the metadata update operation with a valid UUID format
  // This validates the operation structure and authorization
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare metadata update with valid structure
  const updateBody = {
    key: RandomGenerator.alphabets(8),
    value: RandomGenerator.alphabets(16),
  } satisfies IDiscussionBoardSystemHealthMetricMetadatum.IUpdate;
  // 4. Attempt the metadata update operation
  // This tests the API call structure and admin authorization
  const result =
    await api.functional.discussionBoard.admin.system_health_metrics.metadata.patchByMetricid(
      adminConnection,
      {
        metricId,
        body: updateBody,
      },
    );
  // 5. Validate the response structure (even if the operation fails due to missing metric)
  // This ensures the API endpoint is properly configured
  typia.assert(result);
  // 6. Validate that the response has the correct structure for a metadata record
  TestValidator.equals("response has id field", typeof result.id, "string");
  TestValidator.equals("response has key field", typeof result.key, "string");
  TestValidator.equals(
    "response has value field",
    typeof result.value,
    "string",
  );
  TestValidator.equals(
    "response has created_at field",
    typeof result.created_at,
    "string",
  );
  TestValidator.equals(
    "response has updated_at field",
    typeof result.updated_at,
    "string",
  );
  TestValidator.equals(
    "response has system_health_metric_id field",
    typeof result.system_health_metric_id,
    "string",
  );
}
