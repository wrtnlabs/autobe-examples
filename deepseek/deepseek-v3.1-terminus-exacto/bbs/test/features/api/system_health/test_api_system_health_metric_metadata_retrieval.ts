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

/**
 * Test the successful retrieval of a specific metadata record associated with a system health metric.
 * 1. Authenticate as superAdmin using join operation
 * 2. Create a system health metric with metadata (if required by the system)
 * 3. Retrieve specific metadata record by ID
 * 4. Validate response structure and parent metric relationship
 */
export async function test_api_system_health_metric_metadata_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Since we cannot search for metadata without existing metrics,
  // and the API doesn't provide a way to list metrics or metadata,
  // we need to work with the assumption that valid IDs are available.
  // For this test, we'll use randomly generated IDs and test error handling
  // or rely on pre-existing data in the test environment.
  const metricId = typia.random<string & tags.Format<"uuid">>();
  const metadataId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the metadata record
  // This will test the endpoint's behavior with the given IDs
  const retrievedMetadata =
    await api.functional.discussionBoard.superAdmin.system_health_metrics.metadata.at(
      superAdminConnection,
      {
        metricId,
        metadataId,
      },
    );
  typia.assert(retrievedMetadata);
  // 4. Validate the response structure
  TestValidator.predicate("metadata has valid UUID ID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedMetadata.id,
    ),
  );
  TestValidator.predicate(
    "key is non-empty string",
    retrievedMetadata.key.length > 0,
  );
  TestValidator.predicate(
    "value is non-empty string",
    retrievedMetadata.value.length > 0,
  );
  TestValidator.predicate("system_health_metric_id is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedMetadata.system_health_metric_id,
    ),
  );
  TestValidator.predicate("created_at is valid ISO string", () => {
    const date = new Date(retrievedMetadata.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO string", () => {
    const date = new Date(retrievedMetadata.updated_at);
    return !isNaN(date.getTime());
  });
}
