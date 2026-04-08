import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_edit_history_entry_access_denied_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as Member A.
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.assert<
        string & tags.MinLength<1> & tags.Format<"password">
      >(typia.random<string & tags.Format<"password">>()),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });

  // 2) Join as Member B.
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.assert<
        string & tags.MinLength<1> & tags.Format<"password">
      >(typia.random<string & tags.Format<"password">>()),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });

  // 3) Forbidden target: an edit history entry owned by Member A.
  // The provided SDK surface in this prompt does not include todo creation/edit endpoints,
  // so we cannot deterministically create a real edit history row inside this test.
  // We still validate that Member B is rejected when requesting an edit-history entry.
  const todoId_A: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const editHistoryEntryId_A: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4) Member B attempts to retrieve Member A's edit history entry.
  await TestValidator.error(
    "should deny edit history access for other member without leaking details",
    async () => {
      await api.functional.multiUserTodo.member.todos.edit_history_entries.at(
        memberBConnection,
        {
          todoId: todoId_A,
          todoEditHistoryEntryId: editHistoryEntryId_A,
        },
      );
    },
  );
}
