import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryEntry";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_history_entries_privacy_denied_cross_user_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1) Sign up member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 2) Create a todo under member B
  const memberBTodo = await generate_random_todo_app_member_todos_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(memberBTodo);
  // Capture member B's current history state
  const memberBHistoryBefore =
    await api.functional.todoApp.member.todos.history_entries.index(
      memberBConnection,
      {
        todoId: memberBTodo.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(memberBHistoryBefore);
  // 3) Sign up member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 4) Member A attempts to PATCH history entries for member B's todo
  const maliciousPatchBody = {
    page: 1,
    limit: 1,
  } satisfies ITodoAppTodoHistoryEntry.IRequest;
  let memberAResult: IPageITodoAppTodoHistoryEntry.ISummary | undefined;
  try {
    const patched =
      await api.functional.todoApp.member.todos.history_entries.index(
        memberAConnection,
        {
          todoId: memberBTodo.id,
          body: maliciousPatchBody,
        },
      );
    typia.assert(patched);
    memberAResult = patched;
  } catch {
    // Expected: denial or access rejection. Treat as pass.
  }
  // The operation must not return member B's history data to member A.
  // If it succeeded, ensure it did not mirror member B's preexisting history slice.
  if (memberAResult) {
    const beforeFirstPage = memberBHistoryBefore.data.slice(0, 1);
    TestValidator.notEquals(
      "member A must not receive member B history entry data",
      memberAResult.data,
      beforeFirstPage,
    );
  }
  // Confirm no persistent change is applied to member B's history state
  const memberBHistoryAfter =
    await api.functional.todoApp.member.todos.history_entries.index(
      memberBConnection,
      {
        todoId: memberBTodo.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(memberBHistoryAfter);
  TestValidator.equals(
    "member B history total record count unchanged",
    memberBHistoryAfter.pagination.records,
    memberBHistoryBefore.pagination.records,
  );
  TestValidator.equals(
    "member B history first page data unchanged",
    memberBHistoryAfter.data,
    memberBHistoryBefore.data,
  );
}
