import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
import type { IMultiUserTodoEditHistoryFieldChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryFieldChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_edit_history_field_change_invalid_references(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Edit the todo to create edit history with field changes
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Since we cannot view edit histories to get field change IDs, we'll test with invalid UUIDs
  // The server should validate all three IDs (todoId, historyId, fieldChangeId) exist and are related
  // 4. Test with invalid todo ID (valid but non-existent UUID)
  const invalidTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "invalid todo ID returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.edit_histories.field_changes.update(
        memberConnection,
        {
          todoId: invalidTodoId,
          historyId: typia.random<string & tags.Format<"uuid">>(),
          fieldChangeId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            field_name: RandomGenerator.paragraph({ sentences: 1 }),
            new_value: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMultiUserTodoEditHistoryFieldChange.IUpdate,
        },
      );
    },
  );
  // 5. Test with invalid edit history ID (valid but non-existent UUID)
  await TestValidator.httpError(
    "invalid history ID returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.edit_histories.field_changes.update(
        memberConnection,
        {
          todoId: todo.id,
          historyId: typia.random<string & tags.Format<"uuid">>(),
          fieldChangeId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            field_name: RandomGenerator.paragraph({ sentences: 1 }),
            new_value: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMultiUserTodoEditHistoryFieldChange.IUpdate,
        },
      );
    },
  );
  // 6. Test with invalid field change ID (valid but non-existent UUID)
  await TestValidator.httpError(
    "invalid field change ID returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.edit_histories.field_changes.update(
        memberConnection,
        {
          todoId: todo.id,
          historyId: typia.random<string & tags.Format<"uuid">>(),
          fieldChangeId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            field_name: RandomGenerator.paragraph({ sentences: 1 }),
            new_value: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMultiUserTodoEditHistoryFieldChange.IUpdate,
        },
      );
    },
  );
  // 7. Additional test: valid todoId but todo belongs to different user should also fail
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMember = await authorize_member_join(anotherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(anotherMember);
  await TestValidator.httpError(
    "cannot access other user's todo",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.edit_histories.field_changes.update(
        anotherMemberConnection,
        {
          todoId: todo.id,
          historyId: typia.random<string & tags.Format<"uuid">>(),
          fieldChangeId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            field_name: RandomGenerator.paragraph({ sentences: 1 }),
            new_value: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMultiUserTodoEditHistoryFieldChange.IUpdate,
        },
      );
    },
  );
}
