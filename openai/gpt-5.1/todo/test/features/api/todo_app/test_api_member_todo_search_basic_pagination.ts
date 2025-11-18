import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Verify basic paginated search of member user's own todo items.
 *
 * Business goal: Ensure that an authenticated member user can list their own
 * todos through the PATCH /todoApp/memberUser/todos endpoint using simple
 * pagination (page + limit only), and that the returned page metadata and item
 * ownership are correct.
 *
 * Steps:
 *
 * 1. Join a new member user.
 * 2. Create multiple todos for that user.
 * 3. Call the paginated search endpoint with page=1 and limit=10, omitting all
 *    optional filters.
 * 4. Validate pagination metadata and that all listed todos belong to this member
 *    user.
 */
export async function test_api_member_todo_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Join a new member user to obtain authenticated context
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/signup",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  const memberUserId = authorized.id;
  const memberUserEmail = authorized.email;

  // 2. Create multiple todos for this member user
  const todoCount = 5;
  const createdTodos: ITodoAppTodo[] = await ArrayUtil.asyncRepeat(
    todoCount,
    async (index) => {
      const createBody = {
        title: `Todo #${index + 1} - ${RandomGenerator.paragraph({
          sentences: 2,
        })}`,
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ITodoAppTodo.ICreate;

      const todo: ITodoAppTodo =
        await api.functional.todoApp.memberUser.todos.create(connection, {
          body: createBody,
        });
      typia.assert<ITodoAppTodo>(todo);
      // Ensure ownership is correct in created entity as well
      TestValidator.equals(
        "created todo belongs to joined member user",
        todo.memberUser.id,
        memberUserId,
      );
      return todo;
    },
  );

  TestValidator.equals(
    "number of created todos matches requested count",
    createdTodos.length,
    todoCount,
  );

  // 3. Perform basic paginated search: first page with sufficient limit
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchRequest = {
    page,
    limit,
  } satisfies ITodoAppTodo.IRequest;

  const pageResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: searchRequest,
    });
  typia.assert<IPageITodoAppTodo.ISummary>(pageResult);

  const pagination = pageResult.pagination;

  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination.current matches requested page",
    pagination.current,
    page,
  );

  TestValidator.equals(
    "pagination.limit matches requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records should be at least the number of created todos",
    pagination.records >= createdTodos.length,
  );

  TestValidator.predicate(
    "pagination.pages is consistent with records and limit",
    pagination.pages ===
      Math.ceil(pagination.records / (pagination.limit || 1)),
  );

  // 5. Validate each returned todo summary item
  const summaries = pageResult.data;

  TestValidator.predicate(
    "at least as many summaries as created todos or limited by page size",
    summaries.length >= Math.min(createdTodos.length, limit),
  );

  for (const summary of summaries) {
    typia.assert<ITodoAppTodo.ISummary>(summary);

    // Ownership: all todos must belong to the joined member user
    TestValidator.equals(
      "summary.memberUser.id equals joined member user id",
      summary.memberUser.id,
      memberUserId,
    );

    TestValidator.equals(
      "summary.memberUser.email equals joined member user email",
      summary.memberUser.email,
      memberUserEmail,
    );

    // Basic field population checks are covered by typia.assert, so no
    // additional type-level validations are necessary.
  }
}
