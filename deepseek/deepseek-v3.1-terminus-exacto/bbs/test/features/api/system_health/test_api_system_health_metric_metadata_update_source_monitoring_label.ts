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

export async function test_api_system_health_metric_metadata_update_source_monitoring_label(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Generate a random metric ID for the metadata record
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // Create initial metadata record with legacy monitoring source
  const initialMetadata =
    await generate_random_discussion_board_super_admin_system_health_metrics_metadata_create(
      superAdminConnection,
      {
        params: { metricId },
        body: {
          key: "source",
          value: "legacy_monitoring",
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate,
      },
    );
  typia.assert(initialMetadata);
  // Validate initial metadata properties
  TestValidator.equals(
    "metric ID matches",
    initialMetadata.system_health_metric_id,
    metricId,
  );
  TestValidator.equals("key is source", initialMetadata.key, "source");
  TestValidator.equals(
    "value is legacy_monitoring",
    initialMetadata.value,
    "legacy_monitoring",
  );
  // Update metadata to prometheus monitoring source
  const updatedMetadata =
    await api.functional.discussionBoard.superAdmin.system_health_metrics.metadata.patchByMetricid(
      superAdminConnection,
      {
        metricId,
        body: {
          key: "source",
          value: "prometheus",
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.IUpdate,
      },
    );
  typia.assert(updatedMetadata);
  // Validate updated metadata properties
  TestValidator.equals(
    "metric ID remains unchanged",
    updatedMetadata.system_health_metric_id,
    metricId,
  );
  TestValidator.equals("key remains source", updatedMetadata.key, "source");
  TestValidator.equals(
    "value updated to prometheus",
    updatedMetadata.value,
    "prometheus",
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedMetadata.updated_at,
    initialMetadata.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedMetadata.created_at,
    initialMetadata.created_at,
  );
  // Validate business logic: monitoring source migration
  TestValidator.predicate(
    "successful migration from legacy to prometheus",
    initialMetadata.value === "legacy_monitoring" &&
      updatedMetadata.value === "prometheus",
  );
}
