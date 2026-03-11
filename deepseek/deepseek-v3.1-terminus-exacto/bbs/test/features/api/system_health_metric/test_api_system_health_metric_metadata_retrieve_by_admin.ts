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
import { generate_random_discussion_board_admin_system_health_metrics_metadata_create } from "../../../generate/generate_random_discussion_board_admin_system_health_metrics_metadata_create";
import { prepare_random_discussion_board_system_health_metric_metadatum } from "../../../prepare/prepare_random_discussion_board_system_health_metric_metadatum";

export async function test_api_system_health_metric_metadata_retrieve_by_admin(
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
  // Generate a random metric ID for the metadata
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // Create metadata record using utility function
  const createdMetadata =
    await generate_random_discussion_board_admin_system_health_metrics_metadata_create(
      adminConnection,
      {
        params: { metricId },
        body: {
          key: RandomGenerator.alphabets(8),
          value: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate,
      },
    );
  typia.assert(createdMetadata);
  // Retrieve the metadata using the GET endpoint
  const retrievedMetadata =
    await api.functional.discussionBoard.admin.system_health_metrics.metadata.at(
      adminConnection,
      {
        metricId: createdMetadata.system_health_metric_id,
        metadataId: createdMetadata.id,
      },
    );
  typia.assert(retrievedMetadata);
  // Validate that retrieved metadata matches created metadata exactly
  TestValidator.equals(
    "metadata matches exactly",
    retrievedMetadata,
    createdMetadata,
  );
  // Validate individual fields
  TestValidator.equals("id matches", retrievedMetadata.id, createdMetadata.id);
  TestValidator.equals(
    "key matches",
    retrievedMetadata.key,
    createdMetadata.key,
  );
  TestValidator.equals(
    "value matches",
    retrievedMetadata.value,
    createdMetadata.value,
  );
  TestValidator.equals(
    "system_health_metric_id matches",
    retrievedMetadata.system_health_metric_id,
    createdMetadata.system_health_metric_id,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedMetadata.created_at,
    createdMetadata.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedMetadata.updated_at,
    createdMetadata.updated_at,
  );
}
