import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_health_metric_metadata_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate a regular admin user
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate admin credentials
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Create admin account
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // Authenticate as regular admin using the same password
  const adminLoginResult = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminLoginResult);
  // Verify regular admin has regular grade
  TestValidator.equals(
    "admin grade should be regular",
    adminLoginResult.admin_grade,
    "regular",
  );
  // Attempt to access superAdmin-only endpoint with regular admin credentials
  await TestValidator.httpError(
    "regular admin cannot access superAdmin endpoint",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdmin.system_health_metrics.metadata.at(
        adminConnection,
        {
          metricId: typia.random<string & tags.Format<"uuid">>(),
          metadataId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Create and authenticate a superAdmin user to verify the endpoint is accessible with proper credentials
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResult = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminJoinResult);
  // Verify superAdmin can access the endpoint (positive test)
  const metadata =
    await api.functional.discussionBoard.superAdmin.system_health_metrics.metadata.at(
      superAdminConnection,
      {
        metricId: typia.random<string & tags.Format<"uuid">>(),
        metadataId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(metadata);
}
