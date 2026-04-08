import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
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

export async function test_api_todo_retrieval_own_active_todo_includes_edit_history_ordering(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  const todoOwnerConnection: api.IConnection = { host: connection.host };
  todoOwnerConnection.headers ??= {};
  todoOwnerConnection.headers.Authorization = authorized.token.access;
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    todoOwnerConnection,
    {
      body: {
        title: RandomGenerator.name(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  const retrieved = await api.functional.multiUserTodo.member.todos.at(
    todoOwnerConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals(
    "todo id matches requested",
    retrieved.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo is not permanently removed",
    retrieved.deleted_at,
    null,
  );
  const entries = retrieved.editHistoryEntries;
  TestValidator.predicate("edit history entries correspond to same todo", () =>
    entries.every((e) => e.id === retrieved.id),
  );
  if (entries.length > 1) {
    TestValidator.predicate(
      "edit history is ordered newest-first by updatedAt",
      () => {
        for (let i = 0; i < entries.length - 1; i++) {
          if (entries[i].updatedAt < entries[i + 1].updatedAt) return false;
        }
        return true;
      },
    );
  }
}
