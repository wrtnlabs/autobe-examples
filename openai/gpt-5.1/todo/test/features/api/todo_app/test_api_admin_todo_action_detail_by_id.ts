import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminTodoAction";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that an authenticated admin can read detailed admin-todo action
 * audit records by id.
 *
 * ## Business goal
 *
 * Ensure that once an administrative user has joined (registered) and obtained
 * authorization, they can call the audit-log detail endpoint `GET
 * /todoApp/adminUser/adminTodoActions/{adminTodoActionId}` and receive a
 * well-formed `ITodoAppAdminTodoAction` object.
 *
 * The test focuses on:
 *
 * - Exercising the happy-path flow for an authenticated admin actor.
 * - Verifying the structural integrity of the audit record payload.
 * - Performing light business-level sanity checks on key fields without
 *   duplicating typia's exhaustive type validation.
 *
 * NOTE: There is no creation API for `todo_app_admin_todo_actions` in the
 * provided SDK, so we cannot deterministically insert a fresh audit row. In the
 * simulation environment this is fine because the SDK will fabricate a
 * compatible object using typia.random(). For a real backend, this test assumes
 * that the identifier used either resolves to an existing record or that the
 * environment configures the connection in simulate mode.
 *
 * ## Steps
 *
 * 1. Register an admin user via `POST /auth/adminUser/join` using a syntactically
 *    valid email and password.
 * 2. Assert that the join response is a valid `ITodoAppAdminUser.IAuthorized`,
 *    which also ensures that the SDK has attached the access token to the
 *    connection headers.
 * 3. Generate a random string as `adminTodoActionId` and invoke `GET
 *    /todoApp/adminUser/adminTodoActions/{adminTodoActionId}` through
 *    `api.functional.todoApp.adminUser.adminTodoActions.at`.
 * 4. Assert that the response is a valid `ITodoAppAdminTodoAction` using
 *    `typia.assert` to cover full structural checks, including nested
 *    `adminUser`, `memberUser`, and `todo` summaries.
 * 5. Perform additional semantic checks with `TestValidator`:
 *
 *    - `action_type` is a non-empty string.
 *    - `reason_category` is a non-empty string.
 *    - `created_at` parses as a valid ISO-8601 date-time.
 *    - If `ip` is not null/undefined, it is a non-empty string.
 *    - If `reason_detail` is not null/undefined, it is a non-empty string.
 */
export async function test_api_admin_todo_action_detail_by_id(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorizedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorizedAdmin);

  // 2. Fetch admin todo action detail by random id
  const adminTodoActionId: string = typia.random<string>();

  const action: ITodoAppAdminTodoAction =
    await api.functional.todoApp.adminUser.adminTodoActions.at(connection, {
      adminTodoActionId,
    });
  typia.assert<ITodoAppAdminTodoAction>(action);

  // 3. Business-level sanity checks
  // We do NOT assert that action.id === adminTodoActionId because the simulator
  // returns a random object that ignores the incoming id. Instead, we focus on
  // general invariants.

  // action_type should be a non-empty string
  TestValidator.predicate("action_type must be non-empty", () => {
    return (
      typeof action.action_type === "string" && action.action_type.length > 0
    );
  });

  // reason_category should be a non-empty string
  TestValidator.predicate("reason_category must be non-empty", () => {
    return (
      typeof action.reason_category === "string" &&
      action.reason_category.length > 0
    );
  });

  // created_at should parse as a valid ISO 8601 timestamp
  TestValidator.predicate(
    "created_at must be a valid ISO 8601 timestamp",
    () => {
      const timestamp = Date.parse(action.created_at as string);
      return Number.isFinite(timestamp);
    },
  );

  // If ip is provided (not null/undefined), it should be a non-empty string
  TestValidator.predicate(
    "ip, when present, must be a non-empty string",
    () => {
      if (action.ip === null || action.ip === undefined) return true;
      return typeof action.ip === "string" && action.ip.length > 0;
    },
  );

  // If reason_detail is provided (not null/undefined), it should be a non-empty string
  TestValidator.predicate(
    "reason_detail, when present, must be a non-empty string",
    () => {
      if (action.reason_detail === null || action.reason_detail === undefined) {
        return true;
      }
      return (
        typeof action.reason_detail === "string" &&
        action.reason_detail.length > 0
      );
    },
  );
}
