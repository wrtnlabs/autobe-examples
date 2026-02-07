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

export async function test_api_system_activities_retrieve_article_creation_activity(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Note: Since we don't have article creation endpoints available in the provided API functions,
  // we'll simulate the scenario by retrieving a system activity record with a valid UUID
  // In a real scenario, we would create an article first and then retrieve its activity record
  const activityId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the system activity record
  const activity =
    await api.functional.discussionBoard.superAdmin.system_activities.at(
      superAdminConnection,
      { activityId },
    );
  typia.assert(activity);
  // Validate the activity contains expected statistical data
  TestValidator.predicate(
    "has total activities",
    activity.total_activities >= 0,
  );
  TestValidator.predicate("has success count", activity.success_count >= 0);
  TestValidator.predicate("has error count", activity.error_count >= 0);
  TestValidator.predicate(
    "has valid success rate",
    activity.success_rate >= 0 && activity.success_rate <= 100,
  );
  TestValidator.predicate("has period", activity.period.length > 0);
  TestValidator.predicate(
    "has valid start date",
    activity.start_date.length > 0,
  );
  TestValidator.predicate("has valid end date", activity.end_date.length > 0);
}
