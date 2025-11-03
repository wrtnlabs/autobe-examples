import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouserSession";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_todo_user_sessions_index_filter_by_ip_and_pagination(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * 1. Register a new todoUser to obtain authorization and todoUserId
   * 2. Query the sessions index endpoint with IP prefix filter, pagination and
   *    sort
   * 3. Validate response shape, pagination metadata, IP-filtering semantics, and
   *    stable ordering by createdAt
   */

  // 1) Create a new todoUser via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    displayName: RandomGenerator.name(),
    ip: "192.0.2.123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const todoUserId: string & tags.Format<"uuid"> = authorized.id;

  // 2) Prepare sessions.index request with IP prefix filter and pagination
  const requestBody = {
    page: 1,
    pageSize: 5,
    sortBy: "createdAt",
    order: "desc",
    status: "active",
    ip: "192.0.2.",
  } satisfies ITodoAppTodouserSession.IRequest;

  const page: IPageITodoAppTodouserSession.ISummary =
    await api.functional.todoApp.todoUser.todoUsers.sessions.index(connection, {
      todoUserId,
      body: requestBody,
    });
  typia.assert(page);

  // 3) Business assertions
  // a) pagination metadata sanity
  TestValidator.predicate(
    "pagination.limit is positive",
    page.pagination.limit > 0,
  );
  TestValidator.equals(
    "requested page equals pagination.current",
    page.pagination.current,
    requestBody.page!,
  );

  // b) data length constraints
  TestValidator.predicate(
    "returned items count is within pageSize",
    page.data.length <= (requestBody.pageSize ?? page.pagination.limit),
  );
  TestValidator.predicate(
    "returned items count <= pagination.limit",
    page.data.length <= page.pagination.limit,
  );

  // c) if items exist, validate each item and IP filtering
  if (page.data.length > 0) {
    // typia.assert already validated each item shape; additional business checks:
    for (const session of page.data) {
      typia.assert(session);
      TestValidator.predicate(
        `session ${session.id} has createdAt`,
        typeof session.createdAt === "string" && session.createdAt.length > 0,
      );

      // IP prefix filtering: ensure ip starts with provided prefix
      TestValidator.predicate(
        `session ${session.id} ip matches prefix`,
        session.ip.startsWith(requestBody.ip!),
      );
    }

    // d) stable ordering by createdAt desc
    if (page.data.length >= 2) {
      const timestamps = page.data.map((s) => new Date(s.createdAt).getTime());
      let nonIncreasing = true;
      for (let i = 1; i < timestamps.length; ++i) {
        if (timestamps[i] > timestamps[i - 1]) {
          nonIncreasing = false;
          break;
        }
      }
      TestValidator.predicate(
        "sessions are ordered by createdAt desc",
        nonIncreasing,
      );
    }
  } else {
    // No matches is an acceptable valid case
    TestValidator.predicate(
      "no sessions returned or none match the ip filter",
      page.data.length === 0,
    );
  }
}
