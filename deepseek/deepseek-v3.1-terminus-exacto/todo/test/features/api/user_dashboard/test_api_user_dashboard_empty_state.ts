import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user session with no todos
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: "Empty State User",
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // Call dashboard endpoint
  const dashboard =
    await api.functional.todoApp.user.dashboard.at(userConnection);
  typia.assert(dashboard);
  // Verify all todo counts are zero
  TestValidator.equals("total todos zero", dashboard.total_todos, 0);
  TestValidator.equals("completed todos zero", dashboard.completed_todos, 0);
  TestValidator.equals("incomplete todos zero", dashboard.incomplete_todos, 0);
  // Verify completion percentage is 0 (not NaN)
  TestValidator.equals(
    "completion percentage zero",
    dashboard.completion_percentage,
    0,
  );
  TestValidator.predicate(
    "completion percentage valid",
    dashboard.completion_percentage >= 0 &&
      dashboard.completion_percentage <= 100,
  );
  // Verify recent activity is empty
  TestValidator.equals(
    "recent activity empty",
    dashboard.recent_activity.length,
    0,
  );
  TestValidator.predicate(
    "recent activity is array",
    Array.isArray(dashboard.recent_activity),
  );
  // Verify trash statistics
  const trash = dashboard.trash_statistics;
  typia.assert(trash);
  TestValidator.equals(
    "total deleted count zero",
    trash.total_deleted_count,
    0,
  );
  TestValidator.equals("restored count zero", trash.restored_count, 0);
  TestValidator.equals(
    "permanently deleted count zero",
    trash.permanently_deleted_count,
    0,
  );
  TestValidator.predicate(
    "retention period days positive",
    trash.retention_period_days > 0,
  );
  TestValidator.equals("last cleanup at null", trash.last_cleanup_at, null);
}
