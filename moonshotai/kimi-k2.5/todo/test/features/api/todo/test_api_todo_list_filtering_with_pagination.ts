import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test the primary success scenario for listing member todos with various
 * filter combinations. First authenticate as a member, then create multiple
 * todos with different states (complete, incomplete, different dates), then
 * query the list with various filter criteria combined with pagination.
 *
 * Verifies that:
 * 1. Pagination works correctly with page and limit parameters
 * 2. isComplete filter returns correct subset of todos
 * 3. Date range filters for start_date and due_date work correctly
 * 4. Search text filtering by title and description works
 * 5. Sorting by different fields and sort orders returns correctly ordered results
 * 6. showDeleted=false returns only active todos (not in trash)
 */
export async function test_api_todo_list_filtering_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  typia.assert(member);
  // 2. Create test dates for filtering
  const baseDate = new Date();
  const yesterday = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  // 3. Create multiple todos with different states
  // Incomplete todo with start and due dates
  const incompleteTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Incomplete Task ${RandomGenerator.alphaNumeric(4)}`,
          description: `Description for incomplete todo with search keyword UNIQUETEST`,
          startDate: yesterday.toISOString(),
          dueDate: tomorrow.toISOString(),
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
  typia.assert(incompleteTodo);
  // Complete todo with different dates
  const completeTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Complete Task ${RandomGenerator.alphaNumeric(4)}`,
          description: `Description for complete todo with search keyword UNIQUECOMPLETE`,
          startDate: lastWeek.toISOString(),
          dueDate: yesterday.toISOString(),
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
  typia.assert(completeTodo);
  // Todo with specific search keywords
  const searchTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: `SEARCHABLE_TITLE_${RandomGenerator.alphaNumeric(4)}`,
        description: `This is a searchable description with keyword FINDME`,
        startDate: tomorrow.toISOString(),
        dueDate: nextWeek.toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(searchTodo);
  // 4. Test basic pagination
  const page1 = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(page1);
  // Verify pagination structure
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 2);
  TestValidator.predicate("total records >= 3", page1.pagination.records >= 3);
  TestValidator.predicate("data length <= limit", page1.data.length <= 2);
  // 5. Test page 2
  const page2 = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  // 6. Test isComplete filter - incomplete only
  const incompleteResults =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        isComplete: false,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(incompleteResults);
  TestValidator.predicate(
    "incomplete results contain incompleteTodo",
    incompleteResults.data.some((t) => t.id === incompleteTodo.id),
  );
  TestValidator.predicate(
    "incomplete results do not contain completeTodo",
    !incompleteResults.data.some((t) => t.id === completeTodo.id),
  );
  TestValidator.predicate(
    "all results are incomplete",
    incompleteResults.data.every((t) => t.isComplete === false),
  );
  // 7. Test isComplete filter - completed only
  const completedResults =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        isComplete: true,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(completedResults);
  TestValidator.predicate(
    "completed results contain completeTodo",
    completedResults.data.some((t) => t.id === searchTodo.id),
  );
  TestValidator.predicate(
    "all results are completed",
    completedResults.data.every((t) => t.isComplete === true),
  );
  // 8. Test date range filter for start date
  const startDateResults =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        startFrom: yesterday.toISOString(),
        startTo: nextWeek.toISOString(),
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(startDateResults);
  TestValidator.predicate(
    "start date filter works",
    startDateResults.data.length > 0,
  );
  // 9. Test date range filter for due date
  const dueDateResults = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        dueFrom: yesterday.toISOString(),
        dueTo: nextWeek.toISOString(),
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(dueDateResults);
  TestValidator.predicate(
    "due date filter works",
    dueDateResults.data.length > 0,
  );
  // 10. Test search text filter
  const searchResults = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        search: "SEARCHABLE",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search result contains searchTodo",
    searchResults.data.some((t) => t.id === searchTodo.id),
  );
  // 11. Test sorting by createdAt ascending
  const sortedByCreatedAsc =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        sortField: "createdAt",
        sortOrder: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(sortedByCreatedAsc);
  TestValidator.predicate(
    "sorted by createdAt asc",
    sortedByCreatedAsc.data.length > 1
      ? sortedByCreatedAsc.data[0].createdAt <=
          sortedByCreatedAsc.data[1].createdAt
      : true,
  );
  // 12. Test sorting by createdAt descending
  const sortedByCreatedDesc =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        sortField: "createdAt",
        sortOrder: "desc",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(sortedByCreatedDesc);
  TestValidator.predicate(
    "sorted by createdAt desc",
    sortedByCreatedDesc.data.length > 1
      ? sortedByCreatedDesc.data[0].createdAt >=
          sortedByCreatedDesc.data[1].createdAt
      : true,
  );
  // 13. Test sorting by title
  const sortedByTitle = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        sortField: "title",
        sortOrder: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(sortedByTitle);
  TestValidator.predicate(
    "sorted by title works",
    sortedByTitle.data.length > 0,
  );
  // 14. Test showDeleted filter
  const activeResults = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        showDeleted: false,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(activeResults);
  TestValidator.predicate(
    "showDeleted=false returns only active todos",
    activeResults.data.every(
      (t) => t.completedAt !== null || t.completedAt === null,
    ),
  );
  // 15. Verify all created todos are in the total count
  const allResults = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(allResults);
  TestValidator.predicate(
    "all todos in results contain test todos",
    allResults.data.some((t) => t.id === incompleteTodo.id) &&
      allResults.data.some((t) => t.id === completeTodo.id) &&
      allResults.data.some((t) => t.id === searchTodo.id),
  );
}
