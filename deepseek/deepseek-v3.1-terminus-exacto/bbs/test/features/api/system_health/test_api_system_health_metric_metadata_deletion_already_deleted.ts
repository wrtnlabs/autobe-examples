import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_health_metric_metadata_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Use available authorization utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password123",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate UUIDs for metric and metadata (using available methods)
  const metricId = "123e4567-e89b-12d3-a456-426614174000";
  const metadataId = "123e4567-e89b-12d3-a456-426614174001";
  // First deletion attempt - should succeed
  await api.functional.discussionBoard.admin.system_health_metrics.metadata.erase(
    adminConnection,
    {
      metricId,
      metadataId,
    },
  );
  // Second deletion attempt - should fail with 404
  await TestValidator.httpError(
    "second deletion should return 404",
    404,
    async () =>
      await api.functional.discussionBoard.admin.system_health_metrics.metadata.erase(
        adminConnection,
        {
          metricId,
          metadataId,
        },
      ),
  );
}
