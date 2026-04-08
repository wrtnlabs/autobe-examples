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
 * Test trash listing endpoint with sorting by various date fields.
 *
 * Validates the sorting functionality of the trash listing endpoint, testing both date-based sorting (start_date, due_date, created_at) and handling of null values. Ensures that todos with existing date values appear before todos without dates in ascending sorts, and that sorting direction is properly respected.
 *
 * 1. Authenticate a single member for all operations
 * 2. Test sorting by created_at in descending order
 * 3. Test sorting by start_date in ascending order
 * 4. Test sorting by due_date in ascending order
 * 5. Verify sorting behavior with null date handling
 * 6. Validate pagination metadata is present and correct
 */
export async function test_api_trash_list_sort_by_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a single member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Test sorting by created_at descending (newest first)
  const created_at_desc_response =
    await api.functional.multiUserTodo.member.trash.index(memberConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(created_at_desc_response);
  // Verify sorting by created_at descending
  const sortedByCreatedDesc = created_at_desc_response.data;
  for (let i = 0; i < sortedByCreatedDesc.length - 1; i++) {
    const current = sortedByCreatedDesc[i];
    const next = sortedByCreatedDesc[i + 1];
    TestValidator.predicate(
      "created_at desc order",
      new Date(current.created_at) >= new Date(next.created_at),
    );
  }
  // 3. Test sorting by start_date ascending (nulls at end)
  const start_date_asc_response =
    await api.functional.multiUserTodo.member.trash.index(memberConnection, {
      body: {
        sortBy: "start_date",
        sortOrder: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(start_date_asc_response);
  const sortedByStartDateAsc = start_date_asc_response.data;
  let hasNonNullStartDate = false;
  for (const todo of sortedByStartDateAsc) {
    if (todo.start_date !== null) {
      hasNonNullStartDate = true;
    } else if (hasNonNullStartDate) {
      TestValidator.predicate(
        "null start_date at end of ascending sort",
        false,
      );
    }
  }
  // 4. Test sorting by due_date ascending (nulls at end)
  const due_date_asc_response =
    await api.functional.multiUserTodo.member.trash.index(memberConnection, {
      body: {
        sortBy: "due_date",
        sortOrder: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(due_date_asc_response);
  const sortedByDueDateAsc = due_date_asc_response.data;
  let hasNonNullDueDate = false;
  for (const todo of sortedByDueDateAsc) {
    if (todo.due_date !== null) {
      hasNonNullDueDate = true;
    } else if (hasNonNullDueDate) {
      TestValidator.predicate("null due_date at end of ascending sort", false);
    }
  }
  // 5. Verify each todo has accurate date values in summary
  const allTodos = [
    ...sortedByCreatedDesc,
    ...sortedByStartDateAsc,
    ...sortedByDueDateAsc,
  ];
  for (const todo of allTodos) {
    TestValidator.equals(
      "todo id is UUID",
      true,
      /^[0-9a-f-]{36}$/i.test(todo.id),
    );
    TestValidator.predicate(
      "todo title is string",
      typeof todo.title === "string",
    );
    TestValidator.predicate(
      "todo is_complete is boolean",
      typeof todo.is_complete === "boolean",
    );
    if (todo.start_date !== null) {
      TestValidator.equals(
        "start_date is valid ISO 8601",
        true,
        !isNaN(new Date(todo.start_date!).getTime()),
      );
    }
    if (todo.due_date !== null) {
      TestValidator.equals(
        "due_date is valid ISO 8601",
        true,
        !isNaN(new Date(todo.due_date!).getTime()),
      );
    }
    TestValidator.equals(
      "created_at is valid ISO 8601",
      true,
      !isNaN(new Date(todo.created_at).getTime()),
    );
    TestValidator.equals(
      "deleted_at is valid ISO 8601 or null",
      true,
      todo.deleted_at === null || !isNaN(new Date(todo.deleted_at!).getTime()),
    );
  }
  // 6. Verify pagination metadata is present
  TestValidator.predicate(
    "pagination has current",
    created_at_desc_response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    created_at_desc_response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    created_at_desc_response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    created_at_desc_response.pagination.pages >= 0,
  );
  const expectedPages = Math.ceil(
    created_at_desc_response.pagination.records /
      created_at_desc_response.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages matches calculation",
    expectedPages,
    created_at_desc_response.pagination.pages,
  );
}
