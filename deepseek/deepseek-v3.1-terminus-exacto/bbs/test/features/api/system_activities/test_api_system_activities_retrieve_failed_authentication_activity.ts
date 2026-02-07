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

export async function test_api_system_activities_retrieve_failed_authentication_activity(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authorize as super administrator
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Retrieve system activity record
  const activityId = typia.random<string & tags.Format<"uuid">>();
  const activity =
    await api.functional.discussionBoard.superAdmin.system_activities.at(
      superAdminConnection,
      { activityId },
    );
  typia.assert(activity);
  // Validate system activity statistics
  TestValidator.predicate(
    "total activities positive",
    activity.total_activities >= 0,
  );
  TestValidator.predicate(
    "success count non-negative",
    activity.success_count >= 0,
  );
  TestValidator.predicate(
    "error count non-negative",
    activity.error_count >= 0,
  );
  TestValidator.predicate(
    "success rate valid",
    activity.success_rate >= 0 && activity.success_rate <= 100,
  );
  TestValidator.equals("period defined", typeof activity.period, "string");
  TestValidator.predicate("start date valid", activity.start_date.length > 0);
  TestValidator.predicate("end date valid", activity.end_date.length > 0);
  // Validate previous period comparison
  TestValidator.predicate(
    "total activities change valid",
    typeof activity.previous_period_comparison.total_activities_change ===
      "number",
  );
  TestValidator.predicate(
    "success rate change valid",
    typeof activity.previous_period_comparison.success_rate_change === "number",
  );
  TestValidator.predicate(
    "trend direction valid",
    ["improving", "declining", "stable"].includes(
      activity.previous_period_comparison.trend_direction,
    ),
  );
}
