import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_statistics_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // Create a super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using join endpoint
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  typia.assert(authResult);
  // Call the statistics endpoint
  const statistics =
    await api.functional.discussionBoard.superAdmin.statistics.at(
      superAdminConnection,
    );
  typia.assert(statistics);
  // The statistics endpoint returns a performance metric record
  // Since the platform is empty, we expect the metric_value to be zero
  // for metrics that count platform entities (users, articles, comments, sections)
  TestValidator.predicate(
    "metric value should reflect empty platform",
    statistics.metric_value === 0,
  );
}
