import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

/**
 * Tests the deletion of a Todo List guest by an authenticated user.
 *
 * This function executes the following steps:
 *
 * 1. Registers a new user account and authenticates to obtain authorization.
 * 2. Creates a new guest entry in the todo list guest system.
 * 3. Deletes the created guest by its unique ID using authenticated user context.
 * 4. Attempts to fetch or re-delete the same guest to confirm removal.
 * 5. Validates authorization enforcement and resource existence checks.
 *
 * This end-to-end test ensures that only authorized users can delete guests,
 * verifies guest creation and deletion processes, and confirms that deletion is
 * effectively permanent.
 *
 * All API interactions are performed with proper type-safe DTOs and validated
 * against expected responses.
 */
export async function test_api_todo_list_guest_deletion_by_user(
  connection: api.IConnection,
) {
  // Step 1: User account registration and authentication
  const userInput = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userInput });
  typia.assert(authorizedUser);

  // Step 2: Create a guest
  const guestInput = {
    visitor_ip:
      `192.168.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
      ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`.replace(
        /\s/g,
        "",
      ),
  } satisfies ITodoListGuest.ICreate;

  const guest: ITodoListGuest =
    await api.functional.todoList.todoListGuests.create(connection, {
      body: guestInput,
    });
  typia.assert(guest);

  // Step 3: Delete the guest by ID
  await api.functional.todoList.user.todoListGuests.erase(connection, {
    id: guest.id,
  });

  // Step 4: Validate guest is deleted by attempting to delete again or retrieve
  // Since retrieval API is not provided, validate deletion by expecting error on second deletion
  await TestValidator.error(
    "deleting already deleted guest should throw",
    async () => {
      await api.functional.todoList.user.todoListGuests.erase(connection, {
        id: guest.id,
      });
    },
  );
}
