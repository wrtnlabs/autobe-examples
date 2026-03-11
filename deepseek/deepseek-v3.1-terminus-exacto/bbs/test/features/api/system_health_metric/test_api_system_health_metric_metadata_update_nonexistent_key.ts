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

export async function test_api_system_health_metric_metadata_update_nonexistent_key(
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
  // Generate a valid metric ID
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // Create metadata update body with a key that doesn't exist
  const updateBody = {
    key: RandomGenerator.alphabets(10),
    value: RandomGenerator.alphabets(20),
  } satisfies IDiscussionBoardSystemHealthMetricMetadatum.IUpdate;
  // Attempt to update non-existent metadata key and verify it fails
  await TestValidator.error(
    "update non-existent metadata key should fail",
    async () => {
      await api.functional.discussionBoard.admin.system_health_metrics.metadata.patchByMetricid(
        adminConnection,
        {
          metricId,
          body: updateBody,
        },
      );
    },
  );
}
