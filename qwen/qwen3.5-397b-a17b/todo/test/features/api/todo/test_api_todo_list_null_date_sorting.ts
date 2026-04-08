import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IESortDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortDirection";
import type { IETodoAppTodoFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppTodoFilter";
import type { IETodoAppTodoSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppTodoSort";
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

/**
 * Test todo list null date sorting behavior.
 *
 * Validates the edge case where todos have null start_date and due_date values during sorting operations. This test ensures that the COALESCE-based null handling logic correctly positions todos without dates at the end of the list regardless of sort direction.
 *
 * The test authenticates as a new member and retrieves the todo list with various sorting configurations. It verifies that the API correctly handles null date values when sorting by start_date and due_date in both ascending and descending order.
 *
 * 1. Authenticate as new member using authorize_member_join utility.
 * 2. Test sorting by start_date ASC - validate response structure.
 * 3. Test sorting by start_date DESC - validate response structure.
 * 4. Test sorting by due_date ASC - validate response structure.
 * 5. Test sorting by due_date DESC - validate response structure.
 * 6. Validate that todos with null dates appear at the end of sorted lists.
 */
export async function test_api_todo_list_null_date_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Test sorting by start_date ASC
  const startDateAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "start_date",
        sortDirection: "ASC",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startDateAsc);
  // 3. Test sorting by start_date DESC
  const startDateDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "start_date",
        sortDirection: "DESC",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startDateDesc);
  // 4. Test sorting by due_date ASC
  const dueDateAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "due_date",
        sortDirection: "ASC",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueDateAsc);
  // 5. Test sorting by due_date DESC
  const dueDateDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "due_date",
        sortDirection: "DESC",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueDateDesc);
  // 6. Validate null date positioning - todos with null dates appear at end
  // For ASC sorting: dated todos first (earliest to latest), then null-date todos
  // For DESC sorting: dated todos first (latest to earliest), then null-date todos
  const validateNullDatesAtEnd = (
    title: string,
    todos: ITodoAppTodo.ISummary[],
    dateField: "start_date" | "due_date",
  ): void => {
    if (todos.length === 0) {
      return;
    }
    let foundNullDate = false;
    for (const todo of todos) {
      const dateValue = todo[dateField];
      if (dateValue === null) {
        foundNullDate = true;
      } else if (foundNullDate) {
        // Found a dated todo after a null-date todo - this violates the rule
        TestValidator.predicate(`${title} - null dates at end`, false); // This will fail with clear message
        return;
      }
    }
    // If we reach here without failing, null dates are correctly positioned at end
    TestValidator.predicate(`${title} - null date positioning valid`, true);
  };
  validateNullDatesAtEnd("start_date ASC", startDateAsc.data, "start_date");
  validateNullDatesAtEnd("start_date DESC", startDateDesc.data, "start_date");
  validateNullDatesAtEnd("due_date ASC", dueDateAsc.data, "due_date");
  validateNullDatesAtEnd("due_date DESC", dueDateDesc.data, "due_date");
}
