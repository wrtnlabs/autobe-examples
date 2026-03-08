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

/**
 * Test trash list retrieval functionality.
 * Tests the trash listing endpoint with various filter and sorting combinations.
 * Since there's no API to create or soft-delete todos, this test focuses on
 * validating the trash listing endpoint structure and response format.
 */
export async function test_api_member_trash_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create member session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // Test trash list retrieval with various filters and sorting
  const filters: ("all" | "true" | "false")[] = ["all", "true", "false"];
  const sortBys: ("created_at" | "start_date" | "due_date")[] = [
    "created_at",
    "start_date",
    "due_date",
  ];
  const sortOrders: ("asc" | "desc")[] = ["asc", "desc"];
  for (const isComplete of filters) {
    for (const sortBy of sortBys) {
      for (const sortOrder of sortOrders) {
        const trashResponse = await api.functional.todoApp.member.trash.index(
          memberConnection,
          {
            body: {
              is_complete: isComplete,
              sort_by: sortBy,
              sort_order: sortOrder,
              limit: 100,
              offset: 0,
            } satisfies ITodoAppTodo.IRequest,
          },
        );
        typia.assert(trashResponse);
        // Validate response structure
        TestValidator.equals(
          "trash list has pagination structure",
          true,
          trashResponse.hasOwnProperty("pagination") &&
            trashResponse.hasOwnProperty("data"),
        );
        // Validate pagination structure
        TestValidator.predicate("pagination has required fields", () => {
          const p = trashResponse.pagination;
          return (
            p.hasOwnProperty("current") &&
            p.hasOwnProperty("limit") &&
            p.hasOwnProperty("records") &&
            p.hasOwnProperty("pages")
          );
        });
      }
    }
  }
  // Test with pagination parameters
  const paginatedResponse = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  // Validate pagination results
  TestValidator.predicate(
    "pagination limit respected",
    () => paginatedResponse.data.length <= 10,
  );
  TestValidator.predicate("pagination metadata is valid", () => {
    const p = paginatedResponse.pagination;
    return (
      p.records >= 0 &&
      p.pages >= 0 &&
      p.limit > 0 &&
      p.current >= 0 &&
      (p.pages === 0 || p.current <= p.pages)
    );
  });
  // Test with minimum limit (1)
  const minPageResponse = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        is_complete: "false",
        sort_by: "due_date",
        sort_order: "asc",
        limit: 1,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  TestValidator.equals(
    "pagination with limit 1 returns at most 1 item",
    minPageResponse.data.length <= 1,
    true,
  );
  // Test sorting functionality with date fields
  for (const sortBy of sortBys) {
    const sortedResponse = await api.functional.todoApp.member.trash.index(
      memberConnection,
      {
        body: {
          is_complete: "all",
          sort_by: sortBy,
          sort_order: "desc",
          limit: 20,
          offset: 0,
        } satisfies ITodoAppTodo.IRequest,
      },
    );
    // Validate sorting when data exists
    if (sortedResponse.data.length >= 2) {
      TestValidator.predicate(
        `data sorted by ${sortBy} in descending order`,
        () => {
          for (let i = 0; i < sortedResponse.data.length - 1; i++) {
            const a = sortedResponse.data[i];
            const b = sortedResponse.data[i + 1];
            let valA: string | null = null;
            let valB: string | null = null;
            if (sortBy === "created_at") {
              valA = a.created_at;
              valB = b.created_at;
            } else if (sortBy === "start_date") {
              valA = a.start_date;
              valB = b.start_date;
            } else if (sortBy === "due_date") {
              valA = a.due_date;
              valB = b.due_date;
            }
            // Compare in descending order (larger values first)
            // Use localeCompare for date strings
            const comparison = (valB ?? "").localeCompare(valA ?? "");
            if (comparison > 0) return false;
          }
          return true;
        },
      );
    }
  }
  // Test filtering by completion status
  const completeOnly = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        is_complete: "true",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  TestValidator.predicate(
    "complete filter returns only complete items",
    () =>
      completeOnly.data.length === 0 ||
      completeOnly.data.every((t) => t.is_complete === true),
  );
  const incompleteOnly = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        is_complete: "false",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  TestValidator.predicate(
    "incomplete filter returns only incomplete items",
    () =>
      incompleteOnly.data.length === 0 ||
      incompleteOnly.data.every((t) => t.is_complete === false),
  );
  const allStatus = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        is_complete: "all",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
        offset: 0,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  TestValidator.equals(
    "all filter returns all items (complete + incomplete)",
    allStatus.data.length,
    completeOnly.data.length + incompleteOnly.data.length,
  );
}
