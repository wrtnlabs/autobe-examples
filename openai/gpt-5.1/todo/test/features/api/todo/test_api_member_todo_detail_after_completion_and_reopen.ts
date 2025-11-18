import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_todo_detail_after_completion_and_reopen(
  connection: api.IConnection,
) {
  // 1. Register a new member user and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // optional display name for readability
    display_name: RandomGenerator.name(1),
    // ip is optional; provide null explicitly to let server infer if desired
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 2. Create a new todo for this member user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodo>(created);

  // Sanity checks on newly created todo
  TestValidator.equals(
    "created todo owner id should match authorized member user id",
    created.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "created todo owner email should match authorized member user email",
    created.memberUser.email,
    authorized.email,
  );
  TestValidator.equals(
    "new todo should start as pending",
    created.status,
    "pending",
  );
  TestValidator.equals(
    "new todo should have null completed_at",
    created.completed_at ?? null,
    null,
  );
  TestValidator.equals(
    "new todo should not be logically deleted",
    created.deleted_at ?? null,
    null,
  );

  // 3. Complete the todo
  const completed: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: created.id,
    });
  typia.assert<ITodoAppTodo>(completed);

  // 4. Fetch detail after completion
  const afterComplete: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.at(connection, {
      todoId: created.id,
    });
  typia.assert<ITodoAppTodo>(afterComplete);

  // Invariants after completion
  TestValidator.equals(
    "todo id should remain stable after completion (complete response vs created)",
    completed.id,
    created.id,
  );
  TestValidator.equals(
    "todo id should remain stable in detail after completion",
    afterComplete.id,
    created.id,
  );
  TestValidator.equals(
    "memberUser id should remain stable after completion",
    afterComplete.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "memberUser email should remain stable after completion",
    afterComplete.memberUser.email,
    authorized.email,
  );

  // Status and lifecycle timestamps after completion
  TestValidator.equals(
    "status should be completed after completion transition",
    completed.status,
    "completed",
  );
  TestValidator.equals(
    "status in detail should be completed after completion transition",
    afterComplete.status,
    "completed",
  );

  TestValidator.predicate(
    "completed_at should be non-null after completion",
    afterComplete.completed_at !== null &&
      afterComplete.completed_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at should remain null after completion",
    afterComplete.deleted_at ?? null,
    null,
  );

  TestValidator.predicate(
    "updated_at should be on or after created_at after completion",
    () =>
      new Date(afterComplete.updated_at).getTime() >=
      new Date(created.updated_at).getTime(),
  );

  // 5. Reopen the todo
  const reopened: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.reopen(connection, {
      todoId: created.id,
    });
  typia.assert<ITodoAppTodo>(reopened);

  // 6. Fetch detail after reopen
  const afterReopen: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.at(connection, {
      todoId: created.id,
    });
  typia.assert<ITodoAppTodo>(afterReopen);

  // Invariants after reopen
  TestValidator.equals(
    "todo id should remain stable after reopen",
    afterReopen.id,
    created.id,
  );
  TestValidator.equals(
    "memberUser id should remain stable after reopen",
    afterReopen.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "memberUser email should remain stable after reopen",
    afterReopen.memberUser.email,
    authorized.email,
  );

  // Status and lifecycle timestamps after reopen
  TestValidator.equals(
    "status should revert to pending after reopen (reopen response)",
    reopened.status,
    "pending",
  );
  TestValidator.equals(
    "status in detail should be pending after reopen",
    afterReopen.status,
    "pending",
  );

  TestValidator.equals(
    "completed_at should be cleared (null) after reopen",
    afterReopen.completed_at ?? null,
    null,
  );
  TestValidator.equals(
    "deleted_at should still be null after reopen",
    afterReopen.deleted_at ?? null,
    null,
  );

  TestValidator.predicate(
    "updated_at after reopen should be on or after updated_at after completion",
    () =>
      new Date(afterReopen.updated_at).getTime() >=
      new Date(afterComplete.updated_at).getTime(),
  );
}
