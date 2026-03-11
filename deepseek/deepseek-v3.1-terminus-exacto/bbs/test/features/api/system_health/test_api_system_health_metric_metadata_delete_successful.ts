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

export async function test_api_system_health_metric_metadata_delete_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as superAdmin using join endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Create a new connection with the authentication token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${superAdminAuth.token.access}` },
  };
  // Step 2: Create a metadata record that will be deleted
  const metricId = typia.random<string & tags.Format<"uuid">>();
  const metadataRecord =
    await generate_random_discussion_board_super_admin_system_health_metrics_metadata_create(
      authenticatedConnection,
      {
        body: {
          key: "environment",
          value: "production",
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate,
        params: { metricId },
      },
    );
  typia.assert(metadataRecord);
  // Step 3: Delete the metadata record - this should succeed
  await api.functional.discussionBoard.superAdmin.system_health_metrics.metadata.erase(
    authenticatedConnection,
    {
      metricId,
      metadataId: metadataRecord.id,
    },
  );
  // The DELETE operation should complete without throwing an error
  // This validates that the deletion was successful
  TestValidator.predicate("DELETE operation completed successfully", true);
}
