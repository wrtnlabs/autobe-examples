import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_complete_happy_path_for_owner_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) and obtain authorized context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // Basic sanity checks on the authorized payload.
  await TestValidator.predicate("member user id is uuid", async () => {
    // typia.assert has already validated the format; this predicate just
    // double-checks that id is a non-empty string.
    return typeof authorized.id === "string" && authorized.id.length > 0;
  });

  // 2. Create a todo for this member user.
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodo>(created);

  // Capture initial lifecycle fields.
  const initialTodoId = created.id;
  const initialMemberUserId = created.memberUser.id;
  const initialStatus = created.status;
  const initialCompletedAt = created.completed_at ?? null;
  const initialUpdatedAt = created.updated_at;

  // Ownership should match the authorized member user.
  TestValidator.equals(
    "todo owner matches authorized member user",
    initialMemberUserId,
    authorized.id,
  );

  // Initially, completed_at should be null (or undefined interpreted as null).
  TestValidator.predicate(
    "initial completed_at is null or undefined",
    initialCompletedAt === null,
  );

  // 3. Complete the todo using the dedicated completion endpoint.
  const completed: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: initialTodoId,
    });
  typia.assert<ITodoAppTodo>(completed);

  // 4. Validate lifecycle and ownership invariants after completion.

  // Id and owner must remain the same.
  TestValidator.equals(
    "completed todo id matches original",
    completed.id,
    initialTodoId,
  );
  TestValidator.equals(
    "completed todo owner matches original",
    completed.memberUser.id,
    initialMemberUserId,
  );

  // completed_at should now be non-null.
  TestValidator.predicate(
    "completed_at is set after completion",
    completed.completed_at !== null && completed.completed_at !== undefined,
  );

  // updated_at should be greater than or equal to previous updated_at.
  const initialUpdatedAtDate = new Date(initialUpdatedAt).getTime();
  const completedUpdatedAtDate = new Date(completed.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is not earlier after completion",
    completedUpdatedAtDate >= initialUpdatedAtDate,
  );

  // Status should change to something that looks like a completed state if it differed.
  // We do a best-effort check: if status changed, the new status should contain
  // the word "complete" (case-insensitive).
  const statusChanged = completed.status !== initialStatus;
  if (statusChanged) {
    const lower = completed.status.toLowerCase();
    TestValidator.predicate(
      "completed status string indicates completion",
      lower.includes("complete"),
    );
  }

  // 5. Optional idempotency check: calling complete again should keep it completed.
  const completedAgain: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: initialTodoId,
    });
  typia.assert<ITodoAppTodo>(completedAgain);

  TestValidator.equals(
    "idempotent completion keeps same id",
    completedAgain.id,
    completed.id,
  );
  TestValidator.predicate(
    "idempotent completion keeps completed_at non-null",
    completedAgain.completed_at !== null &&
      completedAgain.completed_at !== undefined,
  );
}
