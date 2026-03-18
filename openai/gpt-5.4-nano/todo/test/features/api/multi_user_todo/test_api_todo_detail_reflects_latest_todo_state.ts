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
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_detail_reflects_latest_todo_state(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authorize as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2) Prepare authenticated actor connection
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 3) Create a todo
  const created = await generate_random_multi_user_todo_member_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(created);
  // 4) Update the same todo by changing only edited_at (field exists in IUpdate)
  const editedAt = new Date().toISOString();
  const updated = await api.functional.multiUserTodo.member.todos.update(
    userConnection,
    {
      // SDK types indicate todoId is a uuid; we use created.id from create response.
      todoId: created.id,
      body: {
        edited_at: editedAt,
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    },
  );
  typia.assert(updated);
  // 5) Read detailed todo
  const detail = await api.functional.multiUserTodo.member.todos.at(
    userConnection,
    {
      todoId: created.id,
    },
  );
  typia.assert(detail);
  // 6) Validate latest state
  TestValidator.equals("detail id matches", detail.id, created.id);
  TestValidator.equals(
    "detail editedAt matches latest update",
    detail.editedAt,
    editedAt,
  );
  TestValidator.equals(
    "detail deletedAt is null (not soft-deleted)",
    detail.deletedAt,
    null,
  );
  // 7) Validate response does not embed edit-history entries inline.
  // Based on provided DTOs, this endpoint returns IMultiUserTodoEditHistoryEntry with field-level `changes`.
  // We verify that it does not include nested edit-history-entry collection beyond `changes`.
  TestValidator.predicate(
    "no nested edit-history entries are embedded",
    !("entries" in (detail as unknown as Record<string, unknown>)),
  );
}
