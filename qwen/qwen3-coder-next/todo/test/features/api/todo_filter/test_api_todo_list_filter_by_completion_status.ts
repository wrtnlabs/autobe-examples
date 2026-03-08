import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_list_filter_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAInfo = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(memberAInfo);
  // 2. Create member B account (for privacy isolation test)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBInfo = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(memberBInfo);
  // 3. Member A creates incomplete todo
  const incompleteTodo = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      },
    },
  );
  typia.assert(incompleteTodo);
  // 4. Member A creates completed todo
  const completedTodo = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      },
    },
  );
  typia.assert(completedTodo);
  // 5. Member B creates todo (should not be visible to member A)
  const memberBTodo = await api.functional.todoApp.member.todos.index(
    memberBConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      },
    },
  );
  typia.assert(memberBTodo);
  // 6. Test filtering with is_complete='all' for member A
  const allFilter = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      },
    },
  );
  typia.assert(allFilter);
  TestValidator.equals(
    "all filter returns member A's todos only",
    allFilter.data.length,
    2,
  );
  TestValidator.equals(
    "all filter pagination matches",
    allFilter.pagination.records,
    2,
  );
  TestValidator.equals(
    "all filter excludes member B",
    allFilter.data.filter((t) => t.id === memberBTodo.data[0]?.id).length,
    0,
  );
  // 7. Test filtering with is_complete='true' for member A
  const trueFilter = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        is_complete: "true",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      },
    },
  );
  typia.assert(trueFilter);
  TestValidator.equals(
    "true filter returns completed todos only",
    trueFilter.data.length,
    1,
  );
  TestValidator.equals(
    "true filter pagination matches",
    trueFilter.pagination.records,
    1,
  );
  TestValidator.equals(
    "true filter has completed todo",
    trueFilter.data[0].is_complete,
    true,
  );
  // 8. Test filtering with is_complete='false' for member A
  const falseFilter = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        is_complete: "false",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      },
    },
  );
  typia.assert(falseFilter);
  TestValidator.equals(
    "false filter returns incomplete todos only",
    falseFilter.data.length,
    1,
  );
  TestValidator.equals(
    "false filter pagination matches",
    falseFilter.pagination.records,
    1,
  );
  TestValidator.equals(
    "false filter has incomplete todo",
    falseFilter.data[0].is_complete,
    false,
  );
  // 9. Verify member B cannot see member A's todos
  const memberBAllFilter = await api.functional.todoApp.member.todos.index(
    memberBConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      },
    },
  );
  typia.assert(memberBAllFilter);
  TestValidator.equals(
    "member B sees only their own todos",
    memberBAllFilter.data.length,
    1,
  );
  TestValidator.equals(
    "member B does not see member A's todos",
    memberBAllFilter.data.filter(
      (t) =>
        t.id === incompleteTodo.data[0]?.id ||
        t.id === completedTodo.data[0]?.id,
    ).length,
    0,
  );
}
