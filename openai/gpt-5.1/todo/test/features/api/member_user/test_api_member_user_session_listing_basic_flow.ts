import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberuserSession";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuserSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate basic listing of a member user's authentication sessions.
 *
 * Business flow covered by this test:
 *
 * 1. Join as a new member user (POST /auth/memberUser/join) to obtain an
 *    authenticated context and concrete memberUserId.
 * 2. As that member user, create a todo (POST /todoApp/memberUser/todos) using
 *    ITodoAppTodo.ICreate to simulate normal usage.
 * 3. Complete the created todo (POST /todoApp/memberUser/todos/{todoId}/complete)
 *    to add more authenticated activity.
 * 4. List sessions for the same member user via PATCH
 *    /todoApp/memberUser/memberUsers/{memberUserId}/sessions with an
 *    ITodoAppMemberuserSession.IRequest body using page/limit pagination and
 *    default filters (activeOnly=false, createdFrom=null, createdTo=null).
 * 5. Assert that the response is a valid IPageITodoAppMemberuserSession.ISummary
 *    and that the sessions list for this typical scenario is non-empty and
 *    pagination metadata reflects the request.
 */
export async function test_api_member_user_session_listing_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register (join) a new member user and get authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo.example.com/signup",
    referrer: "https://todo.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a todo as this member user to simulate normal app usage
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "todo should belong to the joined member user",
    createdTodo.memberUser.id,
    authorized.id,
  );

  // 3. Complete the created todo to add additional authenticated activity
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(completedTodo);

  TestValidator.equals(
    "completed todo id should match created todo id",
    completedTodo.id,
    createdTodo.id,
  );

  // 4. List sessions for this member user with basic pagination and filters
  const requestBody = {
    page: 1,
    limit: 10,
    activeOnly: false,
    createdFrom: null,
    createdTo: null,
  } satisfies ITodoAppMemberuserSession.IRequest;

  const page: IPageITodoAppMemberuserSession.ISummary =
    await api.functional.todoApp.memberUser.memberUsers.sessions.index(
      connection,
      {
        memberUserId: authorized.id,
        body: requestBody,
      },
    );
  typia.assert(page);

  // 5. Validate pagination metadata
  const pagination = page.pagination;
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination limit should reflect request limit",
    pagination.limit,
    10 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  // Typical flow expects at least one session recorded for the member user.
  TestValidator.predicate(
    "session list should contain at least one record in typical flow",
    page.data.length > 0,
  );

  // Sessions have already been fully type-validated by typia.assert(page),
  // so no additional type/shape validation is needed here.
}
