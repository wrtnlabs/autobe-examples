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

export async function test_api_todo_creation_defaults_incomplete_and_not_deleted(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test todo creation defaults for incomplete, not deleted, and unset scheduling fields.
   *
   * Validates that a member-owned todo created via POST /multiUserTodo/member/todos:
   * 1. Is always stored as incomplete (is_complete=false).
   * 2. Is not soft-deleted on creation (deleted_at=null).
   * 3. Persists scheduling fields as null when the client sends null values for startDate/dueDate.
   * 4. Uses a system-managed lifecycle_state default for normal/active list visibility.
   *
   * 1) Create member session via member join.
   * 2) Create todo with title and null scheduling fields.
   * 3) Assert business-managed state in the response.
   */
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2) Create todo with explicit null scheduling fields
  const title = RandomGenerator.alphabets(10);
  const createBody = {
    title,
    startDate: null,
    dueDate: null,
  } satisfies IMultiUserTodoTodo.ICreate;
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: createBody,
    },
  );
  typia.assert(todo);
  // 3) Validate defaults
  TestValidator.equals("is incomplete", todo.is_complete, false);
  TestValidator.equals("not deleted", todo.deleted_at, null);
  TestValidator.equals("startDate is null", todo.start_date, null);
  TestValidator.equals("dueDate is null", todo.due_date, null);
  // lifecycle_state must be system-managed default; we only validate it's a non-empty string.
  TestValidator.predicate(
    "lifecycle_state is set",
    todo.lifecycle_state.length > 0,
  );
}
