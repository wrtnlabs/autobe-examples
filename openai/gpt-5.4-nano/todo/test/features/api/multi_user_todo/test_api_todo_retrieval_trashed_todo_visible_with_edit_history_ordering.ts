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

export async function test_api_todo_retrieval_trashed_todo_visible_with_edit_history_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create two todos
  const todoA = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoA);
  const todoB = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoB);
  // 3. Move the first todo into trash
  const moved =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberConnection,
      {
        body: {
          ids: [todoA.id],
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(moved);
  TestValidator.equals("movedCount equals 1", moved.movedCount, 1);
  // 4. Retrieve the trashed todo
  const retrieved = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    {
      todoId: todoA.id,
    },
  );
  typia.assert(retrieved);
  // Validate trash semantics (soft-deleted / in trash)
  TestValidator.equals(
    "deleted_at present for trashed todo",
    retrieved.deleted_at !== null,
    true,
  );
  TestValidator.equals("id preserved", retrieved.id, todoA.id);
  // Edit history availability & ordering: entries are ordered most-recent-first
  const entries = retrieved.editHistoryEntries;
  if (entries.length > 0) {
    for (let i = 0; i + 1 < entries.length; ++i) {
      TestValidator.predicate(
        `edit history ordered most-recent-first at index ${i}`,
        entries[i].createdAt >= entries[i + 1].createdAt,
      );
    }
    TestValidator.equals(
      "history entries exist for trashed todo",
      entries.length > 0,
      true,
    );
  }
  // Ensure other todo remains non-deleted (isolation sanity)
  const retrievedB = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    {
      todoId: todoB.id,
    },
  );
  typia.assert(retrievedB);
  TestValidator.equals(
    "other todo not trashed",
    retrievedB.deleted_at === null,
    true,
  );
}
