import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_list_pagination_boundaries_and_sorting_stability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create multiple user accounts using authorize_user_join utility to generate at least 23 users for meaningful pagination tests.
  //    Store their IDs and emails for filtering and sorting verification.
  const userCount = 23;
  const userConnections: api.IConnection[] = [];
  const userSummaries: IMultiUserTodoUser.ISummary[] = [];
  for (let i = 0; i < userCount; i++) {
    const joinBody = {
      email: `user${i}@example.com` satisfies string & tags.Format<"email">,
      password: `pass${i}`,
      displayName: `User Number ${i}`,
      href: `https://example.com/join`,
      referrer: `https://example.com/referrer`,
      ip: null,
    } satisfies IMultiUserTodoUser.IJoin;
    const authorized = await authorize_user_join(
      { host: connection.host },
      { body: joinBody },
    );
    typia.assert(authorized);
    // Create a connection with token set
    const userConn: api.IConnection = { host: connection.host };
    userConn.headers = { Authorization: authorized.token.access };
    userConnections.push(userConn);
    // Store summary for sorting/filtering
    userSummaries.push({
      id: authorized.id,
      email: joinBody.email,
      displayName: joinBody.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
  }
  // 2. Define common pagination parameters
  const limit = 5; // 5 items per page
  // Calculate total pages
  const totalRecords = userCount;
  const totalPages = Math.ceil(totalRecords / limit);
  // 3. Test pagination boundaries
  // Test 3 pagination scenarios: page 1, last page, out-of-range page (totalPages + 1)
  const testPages = [1, totalPages, totalPages + 1];
  for (const targetPage of testPages) {
    const body: IMultiUserTodoUser.IRequest = {
      page: targetPage satisfies number,
      limit: limit satisfies number,
    };
    const response = await api.functional.multiUserTodo.user.users.index(
      userConnections[0],
      {
        body,
      },
    );
    typia.assert(response);
    // Validate pagination info
    TestValidator.equals(
      `pagination current page for page ${targetPage}`,
      response.pagination.current,
      targetPage,
    );
    TestValidator.equals(
      `pagination limit for page ${targetPage}`,
      response.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `pagination records for page ${targetPage}`,
      response.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      `pagination pages for page ${targetPage}`,
      response.pagination.pages,
      totalPages,
    );
    // Validate data count
    if (targetPage <= totalPages) {
      TestValidator.predicate(
        `data length for valid page ${targetPage}`,
        response.data.length > 0 && response.data.length <= limit,
      );
    } else {
      // out of range page should return empty data array
      TestValidator.equals(
        `data length for out-of-range page ${targetPage}`,
        response.data.length,
        0,
      );
    }
  }
  // 4. Test sorting stability and sorting at pagination boundaries
  // Sortable fields: email, displayName, createdAt
  const sortableFields = ["email", "displayName", "createdAt"] as const;
  type SortableField = typeof sortableFields[number];

  function getSummaryValue(
    summary: IMultiUserTodoUser.ISummary,
    key: SortableField,
  ): string {
    // All these fields in ISummary are strings or string|null, safely return string for sorting
    return (summary[key] ?? "") as string;
  }

  for (const sortByBase of sortableFields) {
    const sortBy = sortByBase as SortableField;
    for (const sortOrder of ["asc", "desc"] as const) {
      // Test page 1
      const bodyFirstPage: IMultiUserTodoUser.IRequest = {
        page: 1 satisfies number,
        limit: limit satisfies number,
        sortBy: sortBy as "email" | "displayName" | "createdAt",
        sortOrder: sortOrder,
      };
      // Call the API twice to check stability
      const response1 = await api.functional.multiUserTodo.user.users.index(
        userConnections[0],
        { body: bodyFirstPage },
      );
      typia.assert(response1);
      const response2 = await api.functional.multiUserTodo.user.users.index(
        userConnections[0],
        { body: bodyFirstPage },
      );
      typia.assert(response2);
      // Validate same order in both responses
      TestValidator.equals(
        `sorting stability for ${sortBy} ${sortOrder} on page 1`,
        response1.data.map((d) => d.id),
        response2.data.map((d) => d.id),
      );
      // Validate sorting correctness of data
      if (response1.data.length > 1) {
        for (let i = 0; i < response1.data.length - 1; i++) {
          if (sortBy === "createdAt") {
            if (sortOrder === "asc") {
              TestValidator.predicate(
                `sorted ascending by ${sortBy} at index ${i}`,
                (response1.data[i][sortBy]! <= response1.data[i + 1][sortBy]!) as boolean,
              );
            } else {
              TestValidator.predicate(
                `sorted descending by ${sortBy} at index ${i}`,
                (response1.data[i][sortBy]! >= response1.data[i + 1][sortBy]!) as boolean,
              );
            }
          } else {
            if (sortOrder === "asc") {
              TestValidator.predicate(
                `sorted ascending by ${sortBy} at index ${i}`,
                response1.data[i][sortBy]!.localeCompare(
                  response1.data[i + 1][sortBy]!,
                ) <= 0,
              );
            } else {
              TestValidator.predicate(
                `sorted descending by ${sortBy} at index ${i}`,
                response1.data[i][sortBy]!.localeCompare(
                  response1.data[i + 1][sortBy]!,
                ) >= 0,
              );
            }
          }
        }
      }
      // Test last page also
      const bodyLastPage: IMultiUserTodoUser.IRequest = {
        page: totalPages satisfies number,
        limit: limit satisfies number,
        sortBy: sortBy as "email" | "displayName" | "createdAt",
        sortOrder: sortOrder,
      };
      const lastPageResponse =
        await api.functional.multiUserTodo.user.users.index(
          userConnections[0],
          {
            body: bodyLastPage,
          },
        );
      typia.assert(lastPageResponse);
      // Validate sorting correctness of last page data
      if (lastPageResponse.data.length > 1) {
        for (let i = 0; i < lastPageResponse.data.length - 1; i++) {
          if (sortBy === "createdAt") {
            if (sortOrder === "asc") {
              TestValidator.predicate(
                `sorted ascending by ${sortBy} at last page index ${i}`,
                (lastPageResponse.data[i][sortBy]! <= lastPageResponse.data[i + 1][sortBy]!) as boolean,
              );
            } else {
              TestValidator.predicate(
                `sorted descending by ${sortBy} at last page index ${i}`,
                (lastPageResponse.data[i][sortBy]! >= lastPageResponse.data[i + 1][sortBy]!) as boolean,
              );
            }
          } else {
            if (sortOrder === "asc") {
              TestValidator.predicate(
                `sorted ascending by ${sortBy} at last page index ${i}`,
                lastPageResponse.data[i][sortBy]!.localeCompare(
                  lastPageResponse.data[i + 1][sortBy]!,
                ) <= 0,
              );
            } else {
              TestValidator.predicate(
                `sorted descending by ${sortBy} at last page index ${i}`,
                lastPageResponse.data[i][sortBy]!.localeCompare(
                  lastPageResponse.data[i + 1][sortBy]!,
                ) >= 0,
              );
            }
          }
        }
      }
    }
  }
  // 5. Test filter combinations producing zero results
  const zeroResultFilter: IMultiUserTodoUser.IRequest = {
    email: "nonexistentemail@example.com",
    page: 1 satisfies number,
    limit: limit satisfies number,
  };
  const zeroResultResponse =
    await api.functional.multiUserTodo.user.users.index(userConnections[0], {
      body: zeroResultFilter,
    });
  typia.assert(zeroResultResponse);
  TestValidator.equals(
    "pagination current page for zero results",
    zeroResultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit for zero results",
    zeroResultResponse.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination records for zero results",
    zeroResultResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages for zero results",
    zeroResultResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data length for zero results",
    zeroResultResponse.data.length,
    0,
  );
}
