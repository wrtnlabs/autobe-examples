import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

export async function test_api_guest_users_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin (join) to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todo-app.example.com/join",
    referrer: "https://landing.todo-app.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create at least one Todo status to satisfy dependent admin views
  const statusBody = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert(createdStatus);

  // 3. Perform guest users search with basic filters (status, page, limit, order)
  const requestPage = 1 as number & tags.Type<"int32">;
  const requestLimit = 10 as number & tags.Type<"int32">;

  const guestSearchBody = {
    page: requestPage,
    limit: requestLimit,
    status: "active",
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ITodoAppGuestUser.IRequest;

  const guestPage: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.todoAdmin.guestUsers.index(connection, {
      body: guestSearchBody,
    });
  typia.assert(guestPage);

  const pagination = guestPage.pagination;
  const data = guestPage.data;

  // 4. Validate pagination metadata basics
  TestValidator.predicate(
    "pagination current must be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit must be non-negative",
    pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination records must be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages must be non-negative",
    pagination.pages >= 0,
  );

  // records/pages/data length coherence
  if (pagination.records === 0) {
    TestValidator.equals(
      "no records should yield empty data array",
      data.length,
      0,
    );

    TestValidator.equals(
      "no records should have zero pages",
      pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records > 0, pages should be at least 1",
      pagination.pages >= 1,
    );

    TestValidator.predicate(
      "data length must not exceed limit",
      data.length <= pagination.limit,
    );
  }

  // 5. Validate that all returned guest users match the requested status filter
  for (const guest of data) {
    typia.assert<ITodoAppGuestUser.ISummary>(guest);

    TestValidator.equals(
      "guest status should match requested filter 'active'",
      guest.status,
      guestSearchBody.status,
    );
  }

  // 6. Secondary search: omit status filter and use a different combination
  const secondaryBody = {
    page: requestPage,
    limit: requestLimit,
    // no status filter here
    orderBy: "created_at",
    orderDirection: "asc",
  } satisfies ITodoAppGuestUser.IRequest;

  const secondaryPage: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.todoAdmin.guestUsers.index(connection, {
      body: secondaryBody,
    });
  typia.assert(secondaryPage);

  const secondaryPagination = secondaryPage.pagination;
  const secondaryData = secondaryPage.data;

  // repeat core pagination validations for secondary search
  TestValidator.predicate(
    "secondary pagination current must be non-negative",
    secondaryPagination.current >= 0,
  );

  TestValidator.predicate(
    "secondary pagination limit must be non-negative",
    secondaryPagination.limit >= 0,
  );

  TestValidator.predicate(
    "secondary pagination records must be non-negative",
    secondaryPagination.records >= 0,
  );

  TestValidator.predicate(
    "secondary pagination pages must be non-negative",
    secondaryPagination.pages >= 0,
  );

  if (secondaryPagination.records === 0) {
    TestValidator.equals(
      "secondary search with no records should yield empty data array",
      secondaryData.length,
      0,
    );

    TestValidator.equals(
      "secondary search with no records should have zero pages",
      secondaryPagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "secondary search when records > 0, pages should be at least 1",
      secondaryPagination.pages >= 1,
    );

    TestValidator.predicate(
      "secondary search data length must not exceed limit",
      secondaryData.length <= secondaryPagination.limit,
    );

    for (const guest of secondaryData) {
      typia.assert<ITodoAppGuestUser.ISummary>(guest);
    }
  }
}
