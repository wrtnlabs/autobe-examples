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

export async function test_api_system_health_metric_metadata_update_environment_tag(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // Create initial metadata record with 'environment' key and 'staging' value
  // Note: We need a valid metricId that exists in the system
  // Since we don't have a utility to create system health metrics,
  // we'll use a valid UUID format but the test may need pre-existing data
  const initialMetadata =
    await generate_random_discussion_board_super_admin_system_health_metrics_metadata_create(
      superAdminConnection,
      {
        body: {
          key: "environment",
          value: "staging",
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate,
        params: {
          metricId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(initialMetadata);
  // Update the metadata value from 'staging' to 'production'
  const updatedMetadata =
    await api.functional.discussionBoard.superAdmin.system_health_metrics.metadata.patchByMetricid(
      superAdminConnection,
      {
        metricId: initialMetadata.system_health_metric_id,
        body: {
          key: "environment",
          value: "production",
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.IUpdate,
      },
    );
  typia.assert(updatedMetadata);
  // Validate the update was successful
  TestValidator.equals(
    "metadata key remains unchanged",
    updatedMetadata.key,
    "environment",
  );
  TestValidator.equals(
    "metadata value updated to production",
    updatedMetadata.value,
    "production",
  );
  TestValidator.equals(
    "system health metric ID unchanged",
    updatedMetadata.system_health_metric_id,
    initialMetadata.system_health_metric_id,
  );
  TestValidator.equals(
    "metadata ID unchanged",
    updatedMetadata.id,
    initialMetadata.id,
  );
  TestValidator.predicate(
    "updated_at timestamp should be after created_at",
    updatedMetadata.updated_at > initialMetadata.created_at,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedMetadata.created_at,
    initialMetadata.created_at,
  );
}
