import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_activities_statistics_basic_overview(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator and get authorized connection
  const authorizedSuperAdmin = await authorize_super_admin_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Create authorized connection with the token
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorizedSuperAdmin.token.access,
    },
  };
  // Call system activities statistics with default filters
  const statistics =
    await api.functional.discussionBoard.superAdmin.system_activities.statistics(
      superAdminConnection,
      {
        body: {
          // Use default parameters (undefined values)
          start_date: undefined,
          end_date: undefined,
          activity_type: undefined,
          group_by: undefined,
          page: undefined,
          limit: undefined,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(statistics);
  // Validate business logic consistency (not type validation)
  TestValidator.equals(
    "total equals success + error",
    statistics.total_activities,
    statistics.success_count + statistics.error_count,
  );
}
