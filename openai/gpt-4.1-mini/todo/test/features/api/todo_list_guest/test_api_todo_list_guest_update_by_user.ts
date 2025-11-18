import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_guest_update_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;
  const user: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userBody,
    });
  typia.assert(user);

  // Step 2: Create a Todo List guest to be updated
  const guestBody = {
    visitor_ip: RandomGenerator.pick(["127.0.0.1", "192.168.0.1", "10.0.0.1"]),
  } satisfies ITodoListGuest.ICreate;
  const guest: ITodoListGuest =
    await api.functional.todoList.todoListGuests.create(connection, {
      body: guestBody,
    });
  typia.assert(guest);

  // Step 3: Update the guest with a new visitor IP
  const updateBody = {
    visitor_ip: RandomGenerator.pick([
      "203.0.113.1",
      "198.51.100.2",
      "192.0.2.3",
    ]),
  } satisfies ITodoListGuest.IUpdate;
  const updatedGuest: ITodoListGuest =
    await api.functional.todoList.user.todoListGuests.update(connection, {
      id: guest.id,
      body: updateBody,
    });
  typia.assert(updatedGuest);

  // Validate that the update changed the visitor_ip
  TestValidator.notEquals(
    "updated visitor_ip should differ from original",
    updatedGuest.visitor_ip,
    guest.visitor_ip,
  );
  TestValidator.equals(
    "updated guest id should remain same",
    updatedGuest.id,
    guest.id,
  );
}
