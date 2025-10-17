import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoListTodoStatusFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoListTodoStatusFilter";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

export async function test_api_todo_member_todo_index_owner_scoping(
  connection: api.IConnection,
) {
  /**
   * Validate that listing returns only the requesting member’s Todos and
   * excludes others.
   *
   * Steps:
   *
   * 1. Create two independent authenticated contexts (Member A and Member B) via
   *    join, using two cloned connections to keep tokens isolated without
   *    manually manipulating headers.
   * 2. Using Member A, create multiple Todos.
   * 3. Using Member B, create at least one Todo.
   * 4. List with Member A (status: "all", limit large enough); verify that every
   *    listed Todo belongs to A and none of B's IDs are present. Do not assert
   *    ordering beyond policy.
   */
  // 1) Two isolated authenticated connections
  const connA: api.IConnection = { ...connection, headers: {} };
  const connB: api.IConnection = { ...connection, headers: {} };

  const emailA: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const emailB: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const authorizedA: ITodoListTodoMember.IAuthorized =
    await api.functional.auth.todoMember.join(connA, {
      body: {
        email: emailA,
        password: "P@ssw0rd!A",
      } satisfies ITodoListTodoMemberJoin.ICreate,
    });
  typia.assert(authorizedA);

  const authorizedB: ITodoListTodoMember.IAuthorized =
    await api.functional.auth.todoMember.join(connB, {
      body: {
        email: emailB,
        password: "P@ssw0rd!B",
      } satisfies ITodoListTodoMemberJoin.ICreate,
    });
  typia.assert(authorizedB);

  // 2) Member A creates multiple Todos
  const aTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(3, async () => {
    const created: ITodoListTodo = await api.functional.todoList.todos.create(
      connA,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ITodoListTodo.ICreate,
      },
    );
    typia.assert(created);
    return created;
  });

  // 3) Member B creates at least one Todo
  const bTodo: ITodoListTodo = await api.functional.todoList.todos.create(
    connB,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(bTodo);

  // Build quick lookup sets by id
  const aIds = new Set(aTodos.map((t) => t.id));
  const bIds = new Set([bTodo.id]);

  // 4) List with Member A and validate owner scoping
  const listA: IPageITodoListTodo.ISummary =
    await api.functional.todoList.todoMember.todos.index(connA, {
      body: {
        page: 1 as number, // within Minimum<1>
        limit: 50 as number, // within 10..50
        status: "all",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(listA);

  // Every listed todo id must be one of A's created ids
  await TestValidator.predicate(
    "all listed items are owned by Member A (subset of A-created ids)",
    async () => listA.data.every((s) => aIds.has(s.id)),
  );

  // Ensure no B-created todo id appears
  await TestValidator.predicate(
    "no B-owned todo appears in A's list",
    async () => listA.data.every((s) => !bIds.has(s.id)),
  );

  // Optional sanity checks on pagination (non-strict, environment-tolerant)
  TestValidator.predicate(
    "pagination current page is >= 1",
    listA.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is between 10 and 50",
    listA.pagination.limit >= 10 && listA.pagination.limit <= 50,
  );
  TestValidator.predicate(
    "records count is at least returned data length",
    listA.pagination.records >= listA.data.length,
  );
}
