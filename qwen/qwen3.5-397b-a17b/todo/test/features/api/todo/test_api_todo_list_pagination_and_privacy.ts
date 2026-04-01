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

/**
 * Test the todo list pagination functionality and privacy enforcement.
 *
 * This test validates:
 * 1. Pagination metadata structure and correctness
 * 2. Privacy enforcement between different member accounts
 * 3. Pagination with different page parameters
 */
export async function test_api_todo_list_pagination_and_privacy(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register first member account
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberAuth = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(firstMemberAuth);
  // Step 2: Register second member account
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(secondMemberAuth);
  // Step 3: Get first member's todo list with page 1, limit 5
  const firstMemberPage1 =
    await api.functional.multiUserTodo.member.todos.index(
      firstMemberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(firstMemberPage1);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is valid",
    firstMemberPage1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    firstMemberPage1.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstMemberPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstMemberPage1.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination limit matches request",
    firstMemberPage1.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page matches request",
    firstMemberPage1.pagination.current,
    1,
  );
  // Validate data array length doesn't exceed limit
  TestValidator.predicate(
    "data count doesn't exceed limit on page 1",
    firstMemberPage1.data.length <= firstMemberPage1.pagination.limit,
  );
  // Step 4: Get first member's todo list with page 2, limit 5
  const firstMemberPage2 =
    await api.functional.multiUserTodo.member.todos.index(
      firstMemberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(firstMemberPage2);
  TestValidator.equals(
    "pagination current page is 2",
    firstMemberPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit matches request",
    firstMemberPage2.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data count doesn't exceed limit on page 2",
    firstMemberPage2.data.length <= firstMemberPage2.pagination.limit,
  );
  // Step 5: Get first member's todo list with page 3, limit 5
  const firstMemberPage3 =
    await api.functional.multiUserTodo.member.todos.index(
      firstMemberConnection,
      {
        body: {
          page: 3,
          limit: 5,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(firstMemberPage3);
  TestValidator.equals(
    "pagination current page is 3",
    firstMemberPage3.pagination.current,
    3,
  );
  TestValidator.equals(
    "pagination limit matches request",
    firstMemberPage3.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data count doesn't exceed limit on page 3",
    firstMemberPage3.data.length <= firstMemberPage3.pagination.limit,
  );
  // Step 6: Get second member's todo list
  const secondMemberTodos =
    await api.functional.multiUserTodo.member.todos.index(
      secondMemberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(secondMemberTodos);
  // Validate second member's pagination metadata
  TestValidator.predicate(
    "second member pagination current is valid",
    secondMemberTodos.pagination.current >= 1,
  );
  TestValidator.predicate(
    "second member pagination limit is valid",
    secondMemberTodos.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "second member pagination records is non-negative",
    secondMemberTodos.pagination.records >= 0,
  );
  TestValidator.predicate(
    "second member pagination pages is non-negative",
    secondMemberTodos.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "second member data count doesn't exceed limit",
    secondMemberTodos.data.length <= secondMemberTodos.pagination.limit,
  );
  // Step 7: Privacy validation - verify todo lists are separate
  // Extract todo IDs from both members
  const firstMemberTodoIds = firstMemberPage1.data.map((todo) => todo.id);
  const secondMemberTodoIds = secondMemberTodos.data.map((todo) => todo.id);
  // Verify no overlapping todos between members (privacy enforcement)
  const overlappingIds = firstMemberTodoIds.filter((id) =>
    secondMemberTodoIds.includes(id),
  );
  TestValidator.equals(
    "no todo ID overlap between members (privacy)",
    overlappingIds.length,
    0,
  );
  // Verify member ownership in todo summaries
  firstMemberPage1.data.forEach((todo) => {
    TestValidator.equals(
      "todo belongs to first member",
      todo.member.id,
      firstMemberAuth.id,
    );
  });
  secondMemberTodos.data.forEach((todo) => {
    TestValidator.equals(
      "todo belongs to second member",
      todo.member.id,
      secondMemberAuth.id,
    );
  });
  // Step 8: Verify pagination calculates pages correctly
  // pages should be ceil(records / limit)
  const expectedPagesFirst = Math.ceil(
    firstMemberPage1.pagination.records / firstMemberPage1.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculated correctly for first member",
    firstMemberPage1.pagination.pages,
    expectedPagesFirst,
  );
  const expectedPagesSecond = Math.ceil(
    secondMemberTodos.pagination.records / secondMemberTodos.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculated correctly for second member",
    secondMemberTodos.pagination.pages,
    expectedPagesSecond,
  );
  // Step 9: Verify pagination metadata consistency across pages for first member
  TestValidator.equals(
    "pagination records consistent across pages",
    firstMemberPage1.pagination.records,
    firstMemberPage2.pagination.records,
  );
  TestValidator.equals(
    "pagination records consistent across pages",
    firstMemberPage2.pagination.records,
    firstMemberPage3.pagination.records,
  );
  TestValidator.equals(
    "pagination pages consistent across pages",
    firstMemberPage1.pagination.pages,
    firstMemberPage2.pagination.pages,
  );
  TestValidator.equals(
    "pagination pages consistent across pages",
    firstMemberPage2.pagination.pages,
    firstMemberPage3.pagination.pages,
  );
}
