import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_edit_history_erase_timeline_ordering(
  connection: api.IConnection,
): Promise<void> {
  // This test requires additional endpoints/DTOs for creating a todo,
  // creating/obtaining multiple edit-history entries, and listing/retrieving
  // edit history entries to validate timeline ordering.
  // Only the DELETE erase endpoint is available in the provided SDK materials,
  // therefore the required end-to-end validations cannot be performed.
  // Create an authenticated member session.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Generate UUID placeholders.
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const editHistoryEntryId = typia.random<string & tags.Format<"uuid">>();
  // Erase once.
  await api.functional.multiUserTodo.member.todos.editHistoryEntries.erase(
    memberConnection,
    {
      todoId,
      editHistoryEntryId,
    },
  );
  // Erase twice should be safely denied (idempotent not-available behavior).
  await TestValidator.error(
    "erasing the same edit history entry twice should be denied",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.erase(
        memberConnection,
        {
          todoId,
          editHistoryEntryId,
        },
      );
    },
  );
}
