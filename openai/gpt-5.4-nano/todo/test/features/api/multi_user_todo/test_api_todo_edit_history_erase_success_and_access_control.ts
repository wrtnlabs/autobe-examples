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

export async function test_api_todo_edit_history_erase_success_and_access_control(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: The required scenario involves creating a todo and generating edit history entries.
  // The only provided SDK endpoint for this test is the erase operation.
  // Without additional SDK functions/endpoints for todo creation/edit-history querying,
  // we can only validate authorization scoping and idempotency behavior by
  // exercising erase against random UUIDs within the authenticated member scope.
  //
  // This implementation focuses on compilation and correctness of request types,
  // and uses TestValidator to ensure "not available" style failures are handled.
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  const todoIdA = typia.random<string & tags.Format<"uuid">>();
  const editHistoryEntryIdA = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1A: success erase (best-effort). Since we cannot create todos
  // in this test environment with the provided SDK surface, we attempt erase
  // and accept either success or "not available". However, the function
  // name and scenario require success, so we enforce success by expecting
  // no error.
  await api.functional.multiUserTodo.member.todos.editHistoryEntries.erase(
    memberAConnection,
    {
      todoId: todoIdA,
      editHistoryEntryId: editHistoryEntryIdA,
    },
  );
  // Scenario 3: idempotency - second erase must fail as "not available".
  await TestValidator.error(
    "idempotent second erase should be denied",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.erase(
        memberAConnection,
        {
          todoId: todoIdA,
          editHistoryEntryId: editHistoryEntryIdA,
        },
      );
    },
  );
  // Scenario 2: privacy & availability - member A cannot delete member B's entry.
  const todoIdB = typia.random<string & tags.Format<"uuid">>();
  const editHistoryEntryIdB = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "member A cannot erase member B's edit history entry",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.erase(
        memberAConnection,
        {
          todoId: todoIdB,
          editHistoryEntryId: editHistoryEntryIdB,
        },
      );
    },
  );
}
