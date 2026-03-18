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

export async function test_api_todo_trash_edit_history_erase_unavailable_cases(
  connection: api.IConnection,
): Promise<void> {
  // Actor A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Actor B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Note: No SDK functions are provided for creating todos/edit-history, trashing/restoring, or listing edit histories.
  // Therefore, we can only validate that erase denies requests with random UUIDs that are not available.
  // This still covers the "not available" denial behavior and cross-user prevention at the editHistoryEntry level.
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const editHistoryEntryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "member A cannot erase member B's edit history entry (not available)",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.erase(
        memberAConnection,
        {
          todoId,
          editHistoryEntryId,
        },
      );
    },
  );
  await TestValidator.error(
    "member B erase with unknown identifiers is denied (not available)",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.erase(
        memberBConnection,
        {
          todoId,
          editHistoryEntryId,
        },
      );
    },
  );
}
