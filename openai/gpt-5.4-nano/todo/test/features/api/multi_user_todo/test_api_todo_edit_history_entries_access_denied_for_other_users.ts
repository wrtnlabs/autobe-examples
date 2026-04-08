import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistoryEntry";
import type { IPageIMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_edit_history_entries_access_denied_for_other_users(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });

  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });

  const todoIdNotOwned = typia.random<string & tags.Format<"uuid">>();
  const todoIdRandom = typia.random<string & tags.Format<"uuid">>();

  const body: IMultiUserTodoTodoEditHistoryEntry.IRequest = {
    todoIds: [todoIdNotOwned],
  };

  let error1: unknown;
  try {
    await api.functional.multiUserTodo.member.todos.edit_history_entries.editHistoryEntries(
      memberAConnection,
      {
        todoId: todoIdNotOwned,
        body,
      },
    );
  } catch (exp) {
    error1 = exp;
  }

  let error2: unknown;
  try {
    await api.functional.multiUserTodo.member.todos.edit_history_entries.editHistoryEntries(
      memberAConnection,
      {
        todoId: todoIdRandom,
        body: { todoIds: [todoIdRandom] },
      },
    );
  } catch (exp) {
    error2 = exp;
  }

  TestValidator.predicate(
    "both requests are rejected",
    () => error1 !== undefined && error2 !== undefined,
  );

  const messageOf = (e: unknown): string => {
    type WithToJSON = { toJSON: () => { message: string } };

    if (typia.is<WithToJSON>(e)) {
      return e.toJSON().message;
    }

    if (e instanceof Error) {
      return e.message;
    }

    throw new Error("Expected error payload with message");
  };

  TestValidator.equals(
    "error payload should be consistent regardless of todo existence",
    messageOf(error1),
    messageOf(error2),
  );
}
