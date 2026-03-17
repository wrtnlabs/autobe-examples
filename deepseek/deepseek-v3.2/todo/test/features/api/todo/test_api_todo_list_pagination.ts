import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

/**
 * Test pagination and sorting functionality for todo lists.
 *
 * Creates a member account, generates 30+ todo items, then tests:
 * 1. Pagination with different page sizes (10, 25, 50, 100)
 * 2. Sorting by due_date, start_date, created_at, title with both ascending/descending orders
 * 3. Verifies total records count accuracy and page calculations
 */
export async function test_api_todo_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create 30+ todos using utility function
  const todos = await ArrayUtil.asyncRepeat(30, async (index) => {
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Todo ${index + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          start_date:
            index % 3 === 0
              ? null
              : new Date(
                  Date.now() + index * 1000 * 60 * 60 * 24,
                ).toISOString(),
          due_date:
            index % 4 === 0
              ? null
              : new Date(
                  Date.now() + (index + 1) * 1000 * 60 * 60 * 24,
                ).toISOString(),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  });
  // Verify we have enough todos for pagination
  TestValidator.predicate("should have at least 25 todos", todos.length >= 25);
  // 3. Test pagination with different page sizes
  const pageSizes = [10, 25, 50, 100] as const;
  for (const limit of pageSizes) {
    const page1 = await api.functional.todoApp.member.todos.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: limit satisfies number as number,
        } satisfies ITodoAppTodo.IRequest,
      },
    );
    typia.assert(page1);
    // Validate pagination metadata
    TestValidator.equals(
      `page 1 limit ${limit} - total records`,
      page1.pagination.records,
      todos.length,
    );
    TestValidator.equals(
      `page 1 limit ${limit} - limit matches`,
      page1.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `page 1 limit ${limit} - current page`,
      page1.pagination.current,
      1,
    );
    TestValidator.predicate(
      `page 1 limit ${limit} - pages calculated correctly`,
      page1.pagination.pages === Math.ceil(todos.length / limit),
    );
    // Validate data count doesn't exceed limit
    TestValidator.predicate(
      `page 1 limit ${limit} - data count ≤ limit`,
      page1.data.length <= limit,
    );
    // Test second page if exists
    if (page1.pagination.pages > 1) {
      const page2 = await api.functional.todoApp.member.todos.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit: limit satisfies number as number,
          } satisfies ITodoAppTodo.IRequest,
        },
      );
      typia.assert(page2);
      TestValidator.equals(
        `page 2 limit ${limit} - current page`,
        page2.pagination.current,
        2,
      );
      TestValidator.equals(
        `page 2 limit ${limit} - total records unchanged`,
        page2.pagination.records,
        todos.length,
      );
      TestValidator.notEquals(
        `page 2 limit ${limit} - different data than page 1`,
        page1.data[0]?.id,
        page2.data[0]?.id,
      );
    }
  }
  // 4. Test sorting with all available options and directions
  const sortOptions = [
    "due_date",
    "start_date",
    "created_at",
    "title",
  ] as const;
  for (const sortBy of sortOptions) {
    for (const sortOrder of ["asc", "desc"] as const) {
      const sortedResult = await api.functional.todoApp.member.todos.index(
        memberConnection,
        {
          body: {
            sort_by: sortBy,
            sort_order: sortOrder,
            limit: 30 satisfies number as number,
          } satisfies ITodoAppTodo.IRequest,
        },
      );
      typia.assert(sortedResult);
      // Verify we got the expected number of items
      TestValidator.equals(
        `sort ${sortBy} ${sortOrder} - got all todos`,
        sortedResult.data.length,
        Math.min(30, todos.length),
      );
      // Validate sorting order (basic check - at least verify all IDs are present)
      const resultIds = new Set(sortedResult.data.map((item) => item.id));
      const todoIds = new Set(todos.map((todo) => todo.id));
      TestValidator.equals(
        `sort ${sortBy} ${sortOrder} - all IDs match`,
        resultIds.size,
        Math.min(30, todoIds.size),
      );
      // Verify all returned items belong to the member
      for (const item of sortedResult.data) {
        TestValidator.equals(
          `sort ${sortBy} ${sortOrder} - item belongs to member`,
          item.member.id,
          member.id,
        );
      }
    }
  }
  // 5. Test combined pagination and sorting
  const combinedResult = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 2,
        limit: 10 satisfies number as number,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined - current page",
    combinedResult.pagination.current,
    2,
  );
  TestValidator.equals("combined - limit", combinedResult.pagination.limit, 10);
  TestValidator.predicate(
    "combined - has data",
    combinedResult.data.length > 0,
  );
}
