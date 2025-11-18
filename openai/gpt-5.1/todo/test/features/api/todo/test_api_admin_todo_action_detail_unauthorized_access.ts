import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminTodoAction";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that admin todo action audit detail is inaccessible to
 * unauthenticated callers and to authenticated non-admin member users.
 *
 * Business context: The GET
 * /todoApp/adminUser/adminTodoActions/{adminTodoActionId} endpoint exposes
 * sensitive administrative audit information about moderation actions taken
 * against member users' todos. Only adminUser actors must be able to read these
 * records. Any request without authentication, or authenticated as a regular
 * memberUser, must not be able to see this data.
 *
 * Test steps:
 *
 * 1. Join as an admin user to obtain an admin Authorization token.
 * 2. As the admin, call the adminTodoActions.at endpoint once to obtain a concrete
 *    ITodoAppAdminTodoAction and its id.
 * 3. Construct an unauthenticated connection (no Authorization header) and attempt
 *    to call adminTodoActions.at with the known id, expecting an authorization
 *    error.
 * 4. Register a member user using /auth/memberUser/join to obtain a
 *    member-authenticated connection.
 * 5. With this member user context, attempt to call adminTodoActions.at using the
 *    same adminTodoActionId, again expecting an authorization error.
 *
 * Validation rules:
 *
 * - All successful responses (admin join, initial admin audit fetch, member join)
 *   must be validated with typia.assert().
 * - Unauthorized scenarios must be wrapped with TestValidator.error() using a
 *   descriptive title, only checking that an error is thrown (no status code or
 *   message assertions).
 * - The original connection.headers must not be mutated directly in the test;
 *   when simulating unauthenticated access, create a shallow-cloned connection
 *   object with headers: {} and do not touch its headers afterwards.
 */
export async function test_api_admin_todo_action_detail_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Join as an admin user to obtain a valid admin Authorization token.
  const adminJoinBody = typia.random<ITodoAppAdminUser.IJoin>();
  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As the admin, fetch a concrete admin todo action to obtain id.
  const seededAction: ITodoAppAdminTodoAction =
    await api.functional.todoApp.adminUser.adminTodoActions.at(connection, {
      adminTodoActionId: typia.random<string>(),
    });
  typia.assert(seededAction);
  const adminTodoActionId: string = seededAction.id;

  // 3. Try unauthenticated access using a cloned connection with empty headers.
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.todoApp.adminUser.adminTodoActions.at(
      unauthConnection,
      {
        adminTodoActionId,
      },
    );
  });

  // 4. Register a member user and obtain member-authenticated connection.
  const memberJoinBody = typia.random<ITodoAppMemberUserJoin.IRequest>();
  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. With member authentication, attempt to read admin audit detail again.
  await TestValidator.error(
    "member user cannot access admin todo action detail",
    async () => {
      await api.functional.todoApp.adminUser.adminTodoActions.at(connection, {
        adminTodoActionId,
      });
    },
  );
}
