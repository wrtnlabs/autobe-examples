import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListGuest";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_guest_update_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Authenticate user by joining
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  const user: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(user);

  // 2. Prepare guest todo update data
  const updateData = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 7,
    }),
    is_completed: RandomGenerator.pick([true, false] as const),
    priority: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
  } satisfies ITodoListTodoListGuest.IUpdate;

  // 3. Perform guest todo update operation
  // Use a random UUID string to simulate todo list guest id for update path
  const guestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const updatedGuest: ITodoListTodoListGuest =
    await api.functional.todoList.user.todoListGuests.update(connection, {
      id: guestId,
      body: updateData,
    });
  typia.assert(updatedGuest);

  // 4. Validate that the updated data aligns with the returned guest todo item
  // content & is_completed & priority are updated fields, remain should be unchanged
  TestValidator.equals(
    "updated content matches input",
    updatedGuest.content,
    updateData.content ?? updatedGuest.content,
  );
  TestValidator.equals(
    "updated completed status matches input",
    updatedGuest.is_completed,
    updateData.is_completed ?? updatedGuest.is_completed,
  );
  TestValidator.equals(
    "updated priority matches input",
    updatedGuest.priority,
    updateData.priority ?? updatedGuest.priority,
  );

  // 5. Ensure IDs and timestamps are properly formatted
  TestValidator.predicate(
    "guest id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      updatedGuest.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    typeof updatedGuest.created_at === "string" &&
      !Number.isNaN(Date.parse(updatedGuest.created_at)),
  );
}
