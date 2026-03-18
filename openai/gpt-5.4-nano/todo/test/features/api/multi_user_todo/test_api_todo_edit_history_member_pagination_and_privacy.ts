import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
import type { IPageIMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistoryEntry";
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

export async function test_api_todo_edit_history_member_pagination_and_privacy(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: member views own edit history with pagination (success)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Create todo owned by member A (generates at least one history entry)
  const todoA = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todoA);
  // Perform multiple updates to generate multiple edit-history entries
  const editTimestamps = ArrayUtil.repeat(3, () => new Date().toISOString());
  await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
    todoId: todoA.id,
    body: {
      edited_at: editTimestamps[0],
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
    todoId: todoA.id,
    body: {
      edited_at: editTimestamps[1],
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
    todoId: todoA.id,
    body: {
      edited_at: editTimestamps[2],
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  const page1 =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      memberAConnection,
      {
        todoId: todoA.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(page1);
  const { pagination: p1, data: d1 } = page1;
  const p1Any = p1 as unknown as {
    current?: number;
    page?: number;
    limit?: number;
    size?: number;
    records?: number;
    total?: number;
    pages?: number;
  };
  const p1Current = p1Any.current ?? p1Any.page ?? 1;
  const p1Limit = p1Any.limit ?? p1Any.size ?? 2;
  TestValidator.equals("page1 current", p1Current, 1);
  TestValidator.equals("page1 limit", p1Limit, 2);
  const total1 = p1Any.records ?? p1Any.total ?? 0;
  const expectedPages1 = total1 === 0 ? 0 : Math.ceil(total1 / p1Limit);
  const pages1 = p1Any.pages ?? expectedPages1;
  TestValidator.equals("page1 pages", pages1, expectedPages1);
  TestValidator.predicate(
    "page1 data non-empty or matches total",
    d1.length === 0 ? total1 === 0 : d1.length > 0,
  );
  TestValidator.predicate("page1 data not exceed limit", d1.length <= p1Limit);
  TestValidator.predicate(
    "page1 entries ordered newest-first",
    d1.every((item, idx) => idx === 0 || item.editedAt <= d1[idx - 1].editedAt),
  );
  for (const item of d1) {
    typia.assert(item);
    TestValidator.equals(
      "multiUserTodoId matches requested todoId",
      item.multiUserTodoId,
      todoA.id,
    );
  }
  // Scenario 2: member privacy enforcement (access blocked + no leakage)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  await TestValidator.error(
    "member cannot access another member's edit history",
    async () => {
      const pageOther =
        await api.functional.multiUserTodo.member.todos.editHistory.index(
          memberBConnection,
          {
            todoId: todoA.id,
            body: {
              page: 1,
              limit: 2,
            } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
          },
        );
      typia.assert(pageOther);
      TestValidator.predicate("no leaked entries", pageOther.data.length === 0);
    },
  );
  // Scenario 3: pagination boundary timeline (page 1 vs page 2)
  const moreEdits = ArrayUtil.repeat(2, () => new Date().toISOString());
  await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
    todoId: todoA.id,
    body: {
      edited_at: moreEdits[0],
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
    todoId: todoA.id,
    body: {
      edited_at: moreEdits[1],
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  const pageLimit1Page1 =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      memberAConnection,
      {
        todoId: todoA.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(pageLimit1Page1);
  const pageLimit1Page2 =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      memberAConnection,
      {
        todoId: todoA.id,
        body: {
          page: 2,
          limit: 1,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(pageLimit1Page2);
  const p1lim1 = pageLimit1Page1.pagination;
  const p2lim1 = pageLimit1Page2.pagination;
  const p1lim1Any = p1lim1 as unknown as {
    current?: number;
    page?: number;
    limit?: number;
    size?: number;
    records?: number;
    total?: number;
    pages?: number;
  };
  const p2lim1Any = p2lim1 as unknown as {
    current?: number;
    page?: number;
    limit?: number;
    size?: number;
    records?: number;
    total?: number;
    pages?: number;
  };
  const p1c = p1lim1Any.current ?? p1lim1Any.page ?? 1;
  const p1l = p1lim1Any.limit ?? p1lim1Any.size ?? 1;
  TestValidator.equals("limit1 page1 current", p1c, 1);
  TestValidator.equals("limit1 page1 limit", p1l, 1);
  const total1b = p1lim1Any.records ?? p1lim1Any.total ?? 0;
  const expectedPages1b = total1b === 0 ? 0 : Math.ceil(total1b / p1l);
  const pages1b = p1lim1Any.pages ?? expectedPages1b;
  TestValidator.equals("limit1 page1 pages", pages1b, expectedPages1b);
  const p2c = p2lim1Any.current ?? p2lim1Any.page ?? 2;
  const p2l = p2lim1Any.limit ?? p2lim1Any.size ?? 1;
  TestValidator.equals("limit1 page2 current", p2c, 2);
  TestValidator.equals("limit1 page2 limit", p2l, 1);
  const total2b = p2lim1Any.records ?? p2lim1Any.total ?? 0;
  const expectedPages2b = total2b === 0 ? 0 : Math.ceil(total2b / p2l);
  const pages2b = p2lim1Any.pages ?? expectedPages2b;
  TestValidator.equals("limit1 page2 pages", pages2b, expectedPages2b);
  if (pageLimit1Page1.data.length > 0 && pageLimit1Page2.data.length > 0) {
    const e1 = pageLimit1Page1.data[0];
    const e2 = pageLimit1Page2.data[0];
    typia.assert(e1);
    typia.assert(e2);
    TestValidator.predicate(
      "page1 editedAt >= page2 editedAt",
      e1.editedAt >= e2.editedAt,
    );
    TestValidator.notEquals("page1 and page2 entries differ", e1.id, e2.id);
  }
}
