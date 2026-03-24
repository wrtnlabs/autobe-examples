import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_history_entry_erase_rejects_todo_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as member A (join creates an authenticated connection header).
  const memberConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(memberA);
  // Since no todo/history creation APIs are available in the provided materials,
  // we can only validate that an erase call is rejected when the requested
  // todoId/historyEntryId pair does not correspond to an accessible resource.
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const historyEntryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "rejects erase when todoId/historyEntryId mismatch (or resources not found)",
    async () => {
      await api.functional.todoApp.member.todos.history.erase(
        memberConnection,
        {
          todoId,
          historyEntryId,
        },
      );
    },
  );
}
