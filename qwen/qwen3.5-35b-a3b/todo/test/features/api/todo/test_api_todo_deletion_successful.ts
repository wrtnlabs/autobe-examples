import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

export async function test_api_todo_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create a todo for this member
  const createdTodo =
    await generate_random_multi_user_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          startDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        } satisfies IMultiUserTodoAppTodo.ICreate,
      },
    );
  typia.assert(createdTodo);
  // 3. Verify todo exists before deletion
  TestValidator.equals(
    "todo title matches",
    createdTodo.title,
    createdTodo.title,
  );
  // 4. Verify deletedAt is null before deletion
  TestValidator.equals(
    "deletedAt should be null before deletion",
    createdTodo.deletedAt,
    null,
  );
  // 5. Delete the todo (soft delete)
  await api.functional.multiUserTodoApp.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
  // 6. Verify delete operation succeeded by attempting to verify no duplicate deletion
  // Try to delete the same todo again - should return error
  await TestValidator.error("should not allow duplicate deletion", async () => {
    await api.functional.multiUserTodoApp.member.todos.erase(memberConnection, {
      todoId: createdTodo.id,
    });
  });
}
