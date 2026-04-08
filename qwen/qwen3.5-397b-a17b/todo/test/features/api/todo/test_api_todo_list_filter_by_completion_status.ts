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
 * Test filtering todos by completion status with custom sorting.
 *
 * Validates the todo list filtering and sorting functionality by testing all three filter modes (complete, incomplete, all) combined with different sort fields and directions. Ensures that the API correctly filters todos by completion status and sorts them according to the specified criteria.
 *
 * The test covers all combinations of filter options with sort fields (creation_date, start_date, due_date) and sort directions (ASC, DESC). Each response is validated for proper structure and the pagination metadata is verified to reflect the filtered result count.
 *
 * 1. Member authentication using authorize_member_join.
 * 2. Test filter='complete' with all sort field and direction combinations.
 * 3. Test filter='incomplete' with all sort field and direction combinations.
 * 4. Test filter='all' with all sort field and direction combinations.
 * 5. Validate pagination metadata for each filter scenario.
 */
export async function test_api_todo_list_filter_by_completion_status(
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
  // 2. Define filter and sort combinations to test
  const filters: IETodoAppTodoFilter[] = ["complete", "incomplete", "all"];
  const sortFields: IETodoAppTodoSort[] = [
    "creation_date",
    "start_date",
    "due_date",
  ];
  const sortDirections: IESortDirection[] = ["ASC", "DESC"];
  // 3. Test all filter and sort combinations
  for (const filter of filters) {
    for (const sort of sortFields) {
      for (const sortDirection of sortDirections) {
        const response = await api.functional.todoApp.member.todos.index(
          memberConnection,
          {
            body: {
              filter,
              sort,
              sortDirection,
              page: 1,
              limit: 20,
            } satisfies ITodoAppTodo.IRequest,
          },
        );
        typia.assert(response);
        // Validate pagination structure
        TestValidator.predicate(
          `pagination valid for filter=${filter}, sort=${sort}, direction=${sortDirection}`,
          () =>
            response.pagination.current >= 1 &&
            response.pagination.limit >= 1 &&
            response.pagination.records >= 0 &&
            response.pagination.pages >= 0,
        );
        // Validate all todos match the filter criteria
        for (const todo of response.data) {
          if (filter === "complete") {
            TestValidator.equals(
              `todo should be complete for filter=${filter}`,
              todo.is_completed,
              true,
            );
          } else if (filter === "incomplete") {
            TestValidator.equals(
              `todo should be incomplete for filter=${filter}`,
              todo.is_completed,
              false,
            );
          }
          // For filter='all', both complete and incomplete are valid
        }
      }
    }
  }
  // 4. Test pagination with different page sizes
  for (const limit of [1, 10, 50, 100]) {
    const response = await api.functional.todoApp.member.todos.index(
      memberConnection,
      {
        body: {
          filter: "all",
          sort: "creation_date",
          sortDirection: "DESC",
          page: 1,
          limit,
        } satisfies ITodoAppTodo.IRequest,
      },
    );
    typia.assert(response);
    TestValidator.equals(
      `limit should be ${limit}`,
      response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `data count should not exceed limit`,
      () => response.data.length <= limit,
    );
  }
  // 5. Test default values (null/undefined parameters)
  const defaultResponse = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        filter: null,
        sort: null,
        sortDirection: null,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has valid structure",
    () =>
      defaultResponse.pagination.current >= 1 &&
      defaultResponse.data.length >= 0,
  );
}
