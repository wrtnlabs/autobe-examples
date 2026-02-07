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

/**
 * Test the successful retrieval of system activity statistical analysis.
 * A super administrator should be able to view comprehensive statistical
 * metrics including total activities, success/error counts, success rate,
 * and period comparisons for platform monitoring and audit purposes.
 */
export async function test_api_system_activities_retrieve_successful_login_activity(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Retrieve system activity statistical analysis using the authenticated super admin connection
  const activity =
    await api.functional.discussionBoard.superAdmin.system_activities.at(
      superAdminConnection,
      {
        activityId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(activity);
  // Validate the statistical metrics in the activity response
  TestValidator.predicate(
    "total activities is non-negative",
    activity.total_activities >= 0,
  );
  TestValidator.predicate(
    "success count is non-negative",
    activity.success_count >= 0,
  );
  TestValidator.predicate(
    "error count is non-negative",
    activity.error_count >= 0,
  );
  TestValidator.predicate(
    "success rate is valid percentage",
    activity.success_rate >= 0 && activity.success_rate <= 100,
  );
  TestValidator.predicate("period is defined", activity.period.length > 0);
  TestValidator.predicate(
    "start date is valid",
    new Date(activity.start_date).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "end date is valid",
    new Date(activity.end_date).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "previous period comparison exists",
    activity.previous_period_comparison !== undefined,
  );
}
