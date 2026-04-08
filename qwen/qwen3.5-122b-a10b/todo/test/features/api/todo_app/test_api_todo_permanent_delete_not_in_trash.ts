import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test that permanently deleting an active todo from trash returns 404.
 *
 * Validates the business rule that only soft-deleted todos (those in trash) can be permanently erased. The test ensures that attempting to permanently delete an active todo that has not been moved to trash results in a 404 Not Found error.
 *
 * This test verifies the proper separation between soft deletion and permanent deletion workflows, ensuring that the trash endpoint only accepts todos that have been previously soft-deleted.
 *
 * 1. Authenticate as a member via join endpoint.
 * 2. Create a new active todo with a title.
 * 3. Attempt to permanently delete the todo from trash without soft deleting it first.
 * 4. Verify the operation returns 404 Not Found error.
 */
export async function test_api_todo_permanent_delete_not_in_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create an active todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Attempt to permanently delete the active todo from trash (should fail)
  await TestValidator.httpError(
    "active todo cannot be permanently deleted from trash",
    404,
    async () => {
      await api.functional.todoApp.member.todos.trash.erase(memberConnection, {
        todoId: todo.id,
      });
    },
  );
}
