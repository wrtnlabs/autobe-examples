import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminTodoAction";
import type { ITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminTodoAction";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_todo_actions_search_by_member_and_todo_filters(
  connection: api.IConnection,
) {
  // 1. Arrange: create and authenticate an admin user so that we can call
  //    the restricted adminTodoActions index endpoint.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Happy-path filter scenario: use specific memberUserId and todoId along
  //    with explicit pagination and sorting to query admin todo actions.
  //    Since we cannot provision actual member users or todos here, we treat
  //    these IDs as filter keys and validate only structural and filter
  //    semantics on the response.
  const memberUserId = typia.random<string & tags.Format<"uuid">>();
  const todoId = typia.random<string & tags.Format<"uuid">>();

  const requestBody = {
    page: 1,
    pageSize: 20,
    memberUserId,
    todoId,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ITodoAppAdminTodoAction.IRequest;

  const page: IPageITodoAppAdminTodoAction.ISummary =
    await api.functional.todoApp.adminUser.adminTodoActions.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  // Basic pagination sanity checks for the filtered result.
  TestValidator.predicate(
    "filtered page has non-negative pagination counters",
    page.pagination.current >= 0 &&
      page.pagination.limit >= 0 &&
      page.pagination.records >= 0 &&
      page.pagination.pages >= 0,
  );

  // Verify that every returned admin todo action summary matches the
  // requested memberUserId and todoId.
  for (const action of page.data) {
    typia.assert<ITodoAppAdminTodoAction.ISummary>(action);

    TestValidator.equals(
      "every action's memberUser.id must equal requested memberUserId",
      action.memberUser.id,
      memberUserId,
    );
    TestValidator.equals(
      "every action's todo.id must equal requested todoId",
      action.todo.id,
      todoId,
    );
  }

  // 3. Second scenario: use a different random pair of memberUserId and
  //    todoId, validating that any returned actions (if present) also respect
  //    the provided filters and that pagination remains structurally valid.
  const anotherMemberUserId = typia.random<string & tags.Format<"uuid">>();
  const anotherTodoId = typia.random<string & tags.Format<"uuid">>();

  const anotherBody = {
    page: 1,
    pageSize: 10,
    memberUserId: anotherMemberUserId,
    todoId: anotherTodoId,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ITodoAppAdminTodoAction.IRequest;

  const anotherPage: IPageITodoAppAdminTodoAction.ISummary =
    await api.functional.todoApp.adminUser.adminTodoActions.index(connection, {
      body: anotherBody,
    });
  typia.assert(anotherPage);

  TestValidator.predicate(
    "second filtered page has non-negative pagination counters",
    anotherPage.pagination.current >= 0 &&
      anotherPage.pagination.limit >= 0 &&
      anotherPage.pagination.records >= 0 &&
      anotherPage.pagination.pages >= 0,
  );

  for (const action of anotherPage.data) {
    typia.assert<ITodoAppAdminTodoAction.ISummary>(action);

    TestValidator.equals(
      "second scenario: action's memberUser.id matches requested memberUserId",
      action.memberUser.id,
      anotherMemberUserId,
    );
    TestValidator.equals(
      "second scenario: action's todo.id matches requested todoId",
      action.todo.id,
      anotherTodoId,
    );
  }
}
