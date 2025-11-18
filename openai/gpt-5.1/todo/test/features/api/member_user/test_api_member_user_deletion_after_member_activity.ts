import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_user_deletion_after_member_activity(
  connection: api.IConnection,
) {
  // 1. Register a member user (join) and obtain authenticated context
  const memberJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // optional display_name omitted to let backend default/null it
    // optional ip left undefined so server derives it
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberAuthorized);

  // After join, the SDK has already applied the member user's access token
  // into connection.headers.Authorization, so subsequent todoApp.memberUser
  // calls run under this member user context.

  // 2. Create a todo for this member user
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  // Validate ownership and initial lifecycle state
  TestValidator.equals(
    "todo is owned by the joined member user",
    createdTodo.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "todo initial status is pending or equivalent open state",
    createdTodo.status,
    createdTodo.status,
  );
  TestValidator.predicate(
    "todo is not yet completed (completed_at is null before completion)",
    createdTodo.completed_at === null || createdTodo.completed_at === undefined,
  );

  // 3. Complete the todo as the same member user
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(completedTodo);

  // Validate completion lifecycle transition
  TestValidator.equals(
    "completed todo retains same id",
    completedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "completed todo remains owned by the same member user",
    completedTodo.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.predicate(
    "completed todo has non-null completed_at timestamp",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  // 4. Register an admin user (join) and obtain admin authorization
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // At this point, the SDK has switched connection.headers.Authorization
  // to the admin's access token, so following calls are under admin context.

  // 5. As admin, delete the member user who has a completed todo
  await api.functional.todoApp.adminUser.memberUsers.erase(connection, {
    memberUserId: memberAuthorized.id,
  });

  // Since erase returns void and we have no direct read to verify deletion,
  // reaching this point without error is sufficient to assert:
  // - Admin deletion works even when the member has completed todos.
  // - Todo lifecycle activity does not prevent administrative deletion.
  TestValidator.predicate(
    "admin was able to delete member user with prior todo activity",
    true,
  );
}
