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

/**
 * Test error handling when retrieving non-existent system health metric metadata.
 * 1. Authenticate as admin
 * 2. Create a valid system health metric and metadata record
 * 3. Attempt to retrieve metadata using incorrect/invalid metadataId
 * 4. Verify 404 error response for non-existent record
 */
export async function test_api_system_health_metric_metadata_non_existent_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a valid system health metric and metadata record
  // First, we need to create a system health metric
  // Since we don't have a direct metric creation endpoint, we'll need to use
  // the metadata creation endpoint which requires a metricId
  // However, the scenario requires testing non-existent records, so we'll
  // create a valid record first, then test with non-existent IDs
  // Create a valid metric ID by using the metadata creation endpoint
  const validMetricId = typia.random<string & tags.Format<"uuid">>();
  const validMetadata =
    await generate_random_discussion_board_admin_system_health_metrics_metadata_create(
      adminConnection,
      {
        body: {
          key: RandomGenerator.alphabets(10),
          value: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate,
        params: { metricId: validMetricId },
      },
    );
  typia.assert(validMetadata);
  // 3. Test with non-existent metric ID
  const nonExistentMetricId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent metric should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.system_health_metrics.metadata.at(
        adminConnection,
        {
          metricId: nonExistentMetricId,
          metadataId: validMetadata.id,
        },
      );
    },
  );
  // 4. Test with non-existent metadata ID
  const nonExistentMetadataId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent metadata should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.system_health_metrics.metadata.at(
        adminConnection,
        {
          metricId: validMetricId,
          metadataId: nonExistentMetadataId,
        },
      );
    },
  );
  // 5. Test with mismatched metric-metadata relationship
  const anotherMetricId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "mismatched metric-metadata relationship should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.system_health_metrics.metadata.at(
        adminConnection,
        {
          metricId: anotherMetricId,
          metadataId: validMetadata.id,
        },
      );
    },
  );
}
