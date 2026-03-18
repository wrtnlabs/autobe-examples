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

export async function test_api_trash_todo_detail_retrieval_success_and_cross_user_block(
  connection: api.IConnection,
): Promise<void> {
  // Actor A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuth);
  // Use join-returned token from the authorized connection
  const memberAConnectionAuth: api.IConnection = { host: connection.host };
  memberAConnectionAuth.headers =
    memberAConnection.headers ??
    ({ Authorization: memberAAuth.token.access } as any);
  // Use fixture mapping assumption: backend exposes a member-owned trashed edit-history entry
  // keyed by the member's authenticated id.
  const memberATrashedTodoId: string & tags.Format<"uuid"> = memberAAuth.id;
  const todoDetailA = await api.functional.multiUserTodo.member.trash.at(
    memberAConnectionAuth,
    { todoId: memberATrashedTodoId },
  );
  typia.assert(todoDetailA);
  // Actor B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAuth);
  const memberBConnectionAuth: api.IConnection = { host: connection.host };
  memberBConnectionAuth.headers =
    memberBConnection.headers ??
    ({ Authorization: memberBAuth.token.access } as any);
  const memberBTreshedTodoId: string & tags.Format<"uuid"> = memberBAuth.id;
  // Member B can access its own trashed todo
  const todoDetailB = await api.functional.multiUserTodo.member.trash.at(
    memberBConnectionAuth,
    { todoId: memberBTreshedTodoId },
  );
  typia.assert(todoDetailB);
  // Member A cannot access member B's trashed todo
  await TestValidator.error(
    "cross-user access to member B trashed todo should be rejected",
    async () => {
      await api.functional.multiUserTodo.member.trash.at(
        memberAConnectionAuth,
        { todoId: memberBTreshedTodoId },
      );
    },
  );
  // Member A's own trash view remains unaffected
  const todoDetailA2 = await api.functional.multiUserTodo.member.trash.at(
    memberAConnectionAuth,
    { todoId: memberATrashedTodoId },
  );
  typia.assert(todoDetailA2);
  TestValidator.equals(
    "member A edit-history entry id stable",
    todoDetailA2.id,
    todoDetailA.id,
  );
}
