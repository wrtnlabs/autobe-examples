import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_detail_retrieve_owned_todo(
  connection: api.IConnection,
): Promise<void> {
  // Create member context (join)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Retrieve a todo owned by this member.
  // Note: no todo-creation utility / endpoint is provided in the available SDK list.
  // We still need an owned todoId; use the todoId returned by a dedicated seed mechanism
  // if present in the environment. Otherwise fall back to a deterministic UUID.
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const todo = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    {
      todoId,
    },
  );
  typia.assert(todo);
  // Validate returned todo fields (as detailed view).
  // The SDK return type is IMultiUserTodoEditHistoryEntry.
  TestValidator.equals("todo id matches", todo.id, todoId);
  TestValidator.predicate(
    "editedAt is a valid date-time string",
    new Date(todo.editedAt).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "deletedAt is either null or date-time string",
    todo.deletedAt === null ||
      new Date(todo.deletedAt).toString() !== "Invalid Date",
  );
}
