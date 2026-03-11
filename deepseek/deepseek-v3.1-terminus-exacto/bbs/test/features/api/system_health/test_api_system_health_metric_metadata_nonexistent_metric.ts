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

export async function test_api_system_health_metric_metadata_nonexistent_metric(
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
  // Generate a non-existent metric UUID
  const nonExistentMetricId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to create metadata for non-existent metric and verify 404 error
  await TestValidator.httpError(
    "metadata creation should return 404 for non-existent metric",
    404,
    async () => {
      await api.functional.discussionBoard.admin.system_health_metrics.metadata.create(
        adminConnection,
        {
          metricId: nonExistentMetricId,
          body: {
            key: RandomGenerator.alphabets(10),
            value: RandomGenerator.alphabets(20),
          } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate,
        },
      );
    },
  );
}
