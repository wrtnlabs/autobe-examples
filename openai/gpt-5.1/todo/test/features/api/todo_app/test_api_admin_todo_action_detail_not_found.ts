import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminTodoAction";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_todo_action_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user so that subsequent
  //    adminUser-scoped requests carry a valid Authorization header.
  const authorizedAdmin = await api.functional.auth.adminUser.join(connection, {
    body: typia.random<ITodoAppAdminUser.IJoin>(),
  });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorizedAdmin);

  // 2. Prepare a UUID that should not be associated with any
  //    todo_app_admin_todo_actions row. Using typia.random with
  //    Format<"uuid"> ensures the value is syntactically valid while
  //    being statistically unlikely to collide with real data.
  const nonExistentAdminTodoActionId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Invoke the detail endpoint with the non-existent id and assert
  //    that it results in an error, rather than returning a
  //    ITodoAppAdminTodoAction object.
  await TestValidator.error(
    "admin todo action detail for non-existent id must fail",
    async () => {
      await api.functional.todoApp.adminUser.adminTodoActions.at(connection, {
        adminTodoActionId: nonExistentAdminTodoActionId,
      });
    },
  );
}
