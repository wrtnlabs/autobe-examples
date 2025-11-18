import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_reopen_idempotent_when_already_open(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    // Use realistic URIs for href and referrer
    href: "https://todo-app.example.com/signup",
    referrer: "https://todo-app.example.com/landing",
    // Let ip be omitted so that server may infer it
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a new todo in the default open/pending state
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Basic invariants on the freshly created todo
  TestValidator.equals(
    "created todo owner matches authorized user",
    created.memberUser.id,
    authorized.id,
  );
  TestValidator.predicate(
    "created_at is non-empty ISO string",
    () => created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty ISO string",
    () => created.updated_at.length > 0,
  );
  TestValidator.equals(
    "completed_at is initially null or undefined",
    created.completed_at ?? null,
    null,
  );
  TestValidator.equals(
    "deleted_at is initially null or undefined",
    created.deleted_at ?? null,
    null,
  );

  const originalStatus: string = created.status;
  const originalCreatedAt: string = created.created_at;
  const originalUpdatedAt: string = created.updated_at;

  // 3. First reopen call on an already-open todo
  const reopenedOnce: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.reopen(connection, {
      todoId: created.id,
    });
  typia.assert(reopenedOnce);

  // 4. Validate idempotent behavior on first reopen
  TestValidator.equals(
    "reopen(1) keeps same todo id",
    reopenedOnce.id,
    created.id,
  );
  TestValidator.equals(
    "reopen(1) keeps same owner id",
    reopenedOnce.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "reopen(1) keeps created_at unchanged",
    reopenedOnce.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "reopen(1) does not alter status when already open",
    reopenedOnce.status,
    originalStatus,
  );
  TestValidator.equals(
    "reopen(1) still has no completed_at",
    reopenedOnce.completed_at ?? null,
    null,
  );
  TestValidator.equals(
    "reopen(1) still has no deleted_at",
    reopenedOnce.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "reopen(1) updated_at is not earlier than original",
    () => reopenedOnce.updated_at >= originalUpdatedAt,
  );

  // 5. Repeat reopen multiple times and ensure state stability and monotonic updated_at
  const reopenCount = 3;
  let previousSnapshot: ITodoAppTodo = reopenedOnce;

  for (let i = 0; i < reopenCount; i++) {
    const reopened: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.reopen(connection, {
        todoId: created.id,
      });
    typia.assert(reopened);

    const iterationLabel = `reopen(${i + 2})`; // +2 because first reopen already done

    TestValidator.equals(
      `${iterationLabel} keeps same todo id`,
      reopened.id,
      created.id,
    );
    TestValidator.equals(
      `${iterationLabel} keeps same owner id`,
      reopened.memberUser.id,
      authorized.id,
    );
    TestValidator.equals(
      `${iterationLabel} keeps created_at unchanged`,
      reopened.created_at,
      originalCreatedAt,
    );
    TestValidator.equals(
      `${iterationLabel} keeps status stable`,
      reopened.status,
      originalStatus,
    );
    TestValidator.equals(
      `${iterationLabel} still has no completed_at`,
      reopened.completed_at ?? null,
      null,
    );
    TestValidator.equals(
      `${iterationLabel} still has no deleted_at`,
      reopened.deleted_at ?? null,
      null,
    );
    TestValidator.predicate(
      `${iterationLabel} updated_at is monotonic non-decreasing`,
      () => reopened.updated_at >= previousSnapshot.updated_at,
    );

    previousSnapshot = reopened;
  }
}
