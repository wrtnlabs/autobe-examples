import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_todo_detail_after_update(
  connection: api.IConnection,
) {
  // 1. Register a new member user to establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 2. Create an initial todo for this member user
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createBody = {
    title: initialTitle,
    description: initialDescription,
  } satisfies ITodoAppTodo.ICreate;

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodo>(created);

  // 3. Update the todo's title and description while keeping lifecycle unchanged
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
  } satisfies ITodoAppTodo.IUpdate;

  const updated: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.update(connection, {
      todoId: created.id,
      body: updateBody,
    });
  typia.assert<ITodoAppTodo>(updated);

  // 4. Fetch the todo detail after the update
  const detail: ITodoAppTodo = await api.functional.todoApp.memberUser.todos.at(
    connection,
    {
      todoId: created.id,
    },
  );
  typia.assert<ITodoAppTodo>(detail);

  // 5. Validate identity and ownership consistency
  TestValidator.equals(
    "todo id should remain the same across create, update, and detail",
    detail.id,
    created.id,
  );
  TestValidator.equals(
    "todo id after update should match detail id",
    detail.id,
    updated.id,
  );

  TestValidator.equals(
    "member user id in todo should match authorized user id",
    detail.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "member user email in todo should match authorized user email",
    detail.memberUser.email,
    authorized.email,
  );

  // 6. Validate title/description changes and that they reflect the latest values
  TestValidator.equals(
    "detail title should match updated title",
    detail.title,
    updatedTitle,
  );
  TestValidator.equals(
    "detail description should match updated description",
    detail.description,
    updatedDescription,
  );

  TestValidator.notEquals(
    "title should have changed from initial value",
    detail.title,
    initialTitle,
  );
  TestValidator.notEquals(
    "description should have changed from initial value",
    detail.description,
    initialDescription,
  );

  // 7. Validate lifecycle fields: status, completed_at, created_at, updated_at
  TestValidator.equals(
    "status should remain consistent between update and detail",
    detail.status,
    updated.status,
  );

  TestValidator.equals(
    "created_at should remain the same between create and detail",
    detail.created_at,
    created.created_at,
  );

  // updated_at from update should be >= created.updated_at and equal to detail.updated_at
  TestValidator.predicate(
    "updated_at should be greater than or equal to created.updated_at",
    new Date(updated.updated_at).getTime() >=
      new Date(created.updated_at).getTime(),
  );
  TestValidator.equals(
    "detail updated_at should match updated.updated_at",
    detail.updated_at,
    updated.updated_at,
  );

  // completed_at should remain unchanged (likely null) if status was not changed
  TestValidator.equals(
    "completed_at should remain unchanged between create and detail when not completed",
    detail.completed_at ?? null,
    created.completed_at ?? null,
  );

  // deleted_at should remain unchanged (likely null) across create, update, and detail
  TestValidator.equals(
    "deleted_at should remain unchanged between create and update",
    updated.deleted_at ?? null,
    created.deleted_at ?? null,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged between create and detail",
    detail.deleted_at ?? null,
    created.deleted_at ?? null,
  );
}
