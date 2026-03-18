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

export async function test_api_todo_erase_moves_todo_to_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IMultiUserTodoMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<boolean>(),
      } satisfies IMultiUserTodoMember.IJoin,
    },
  );
  typia.assert(auth);

  // Create connections for subsequent calls
  const authedConnection: api.IConnection = { host: connection.host };
  authedConnection.headers ??= {};
  authedConnection.headers.Authorization = auth.token.access;

  // 2) Create a normal todo owned by this member
  const created: IMultiUserTodoEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_create(
      authedConnection,
      {} satisfies DeepPartial<{
        body?: {
          title?: string & tags.MinLength<1>;
          description?: string | null;
          startDate?: string & tags.Format<"date-time"> | null;
          dueDate?: string & tags.Format<"date-time"> | null;
        };
      }>,
    );
  typia.assert(created);

  const todoId: string & tags.Format<"uuid"> = created.id;

  // 3) Erase (move to trash)
  await api.functional.multiUserTodo.member.todos.erase(authedConnection, {
    todoId,
  });

  // 4) Validate: retrieve from trash
  const trashed1: IMultiUserTodoEditHistoryEntry =
    await api.functional.multiUserTodo.member.trash.at(authedConnection, {
      todoId,
    });
  typia.assert(trashed1);

  TestValidator.equals("trash todo id matches", trashed1.id, created.id);
  TestValidator.equals(
    "trash todo editedAt matches",
    trashed1.editedAt,
    created.editedAt,
  );
  TestValidator.equals(
    "trash todo createdAt matches",
    trashed1.createdAt,
    created.createdAt,
  );
  TestValidator.equals(
    "trash todo updatedAt matches",
    trashed1.updatedAt,
    created.updatedAt,
  );

  // 5) Edge check: erase again should be safe
  await TestValidator.predicate("second erase does not throw", async () => {
    await api.functional.multiUserTodo.member.todos.erase(authedConnection, {
      todoId,
    });
    const trashed2: IMultiUserTodoEditHistoryEntry =
      await api.functional.multiUserTodo.member.trash.at(authedConnection, {
        todoId,
      });
    typia.assert(trashed2);
    TestValidator.equals(
      "trashed after second erase still matches id",
      trashed2.id,
      created.id,
    );
    return true;
  });
}
