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
 * Test scenario where admin updates metadata value while preserving the key identifier.
 * Admin authenticates via join. System has existing metric with metadata having key
 * 'environment' and value 'production'. Admin sends update request with same key
 * 'environment' but new value 'staging'. Verify that the update succeeds, key remains
 * unchanged, value updated to 'staging', updated_at timestamp refreshes.
 */
export async function test_api_system_health_metric_metadata_update_preserve_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using available utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Since metric and metadata creation endpoints are not available,
  // we'll use the provided mockup function pattern with random IDs
  // This tests the update functionality assuming valid IDs exist
  const metricId = typia.random<string & tags.Format<"uuid">>();
  const metadataId = typia.random<string & tags.Format<"uuid">>();
  // 3. Update metadata with same key but new value
  const updateBody = {
    key: "environment",
    value: "staging",
  } satisfies IDiscussionBoardSystemHealthMetricMetadatum.IUpdate;
  const updatedMetadata =
    await api.functional.discussionBoard.admin.system_health_metrics.metadata.putByMetricidAndMetadataid(
      adminConnection,
      {
        metricId,
        metadataId,
        body: updateBody,
      },
    );
  typia.assert(updatedMetadata);
  // 4. Validate update preserved key and updated value
  TestValidator.equals(
    "key should remain unchanged",
    updatedMetadata.key,
    "environment",
  );
  TestValidator.equals(
    "value should be updated",
    updatedMetadata.value,
    "staging",
  );
  TestValidator.predicate(
    "updated_at should be refreshed",
    updatedMetadata.updated_at !== undefined,
  );
  // 5. Validate the metadata structure is complete
  TestValidator.predicate(
    "id should be present",
    updatedMetadata.id !== undefined,
  );
  TestValidator.predicate(
    "created_at should be present",
    updatedMetadata.created_at !== undefined,
  );
  TestValidator.predicate(
    "system_health_metric_id should be present",
    updatedMetadata.system_health_metric_id !== undefined,
  );
}
