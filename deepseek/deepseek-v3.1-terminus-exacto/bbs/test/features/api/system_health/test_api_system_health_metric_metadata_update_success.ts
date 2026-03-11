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

export async function test_api_system_health_metric_metadata_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Generate a random metric ID for the parent system health metric
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create initial metadata record
  const initialMetadata =
    await generate_random_discussion_board_super_admin_system_health_metrics_metadata_create(
      superAdminConnection,
      {
        body: {
          key: RandomGenerator.alphabets(8),
          value: RandomGenerator.alphabets(12),
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate,
        params: { metricId },
      },
    );
  typia.assert(initialMetadata);
  // 4. Update the metadata with new values
  const updatedMetadata =
    await api.functional.discussionBoard.superAdmin.system_health_metrics.metadata.putByMetricidAndMetadataid(
      superAdminConnection,
      {
        metricId,
        metadataId: initialMetadata.id,
        body: {
          key: RandomGenerator.alphabets(8),
          value: RandomGenerator.alphabets(12),
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.IUpdate,
      },
    );
  typia.assert(updatedMetadata);
  // 5. Validate the update was successful
  TestValidator.equals(
    "metadata ID should match",
    updatedMetadata.id,
    initialMetadata.id,
  );
  TestValidator.equals(
    "metric ID should match",
    updatedMetadata.system_health_metric_id,
    metricId,
  );
  TestValidator.notEquals(
    "key should be updated",
    updatedMetadata.key,
    initialMetadata.key,
  );
  TestValidator.notEquals(
    "value should be updated",
    updatedMetadata.value,
    initialMetadata.value,
  );
  TestValidator.predicate(
    "updated_at should be later than created_at",
    new Date(updatedMetadata.updated_at) > new Date(initialMetadata.created_at),
  );
}
