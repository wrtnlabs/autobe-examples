import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdmin";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_admins_search_and_pagination(
  connection: api.IConnection,
) {
  /**
   * E2E tests for PATCH /todoApp/admin/admins
   *
   * Flow:
   *
   * 1. Create caller admin via POST /auth/admin/join (connection will be updated
   *    with Authorization)
   * 2. Create several additional admin accounts to populate listing
   * 3. Call index endpoint with various request bodies to test pagination,
   *    filtering and sorting
   * 4. Assert responses and business rules using typia.assert and TestValidator
   */

  // 1) Create the caller admin (will set Authorization header in connection)
  const callerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const caller: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: callerEmail,
        password: "P@ssw0rd!",
        is_super: true,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(caller);

  // 2) Create additional admins (some super, some normal) to ensure list has data
  const extraAdminsCount = 3;
  const createdAdmins: ITodoAppAdmin.IAuthorized[] = [];
  for (let i = 0; i < extraAdminsCount; ++i) {
    const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
    const created = await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password: "P@ssw0rd!",
        is_super: i % 2 === 0, // alternate
      } satisfies ITodoAppAdmin.ICreate,
    });
    typia.assert(created);
    createdAdmins.push(created);
  }

  // 3) Basic listing: page=1,pageSize=10 sorted by created_at desc
  const pageAll: IPageITodoAppAdmin.ISummary =
    await api.functional.todoApp.admin.admins.index(connection, {
      body: {
        page: 1,
        pageSize: 10,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppAdmin.IRequest,
    });
  typia.assert(pageAll);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page number",
    pageAll.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit field",
    pageAll.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    pageAll.pagination.records >= pageAll.data.length,
  );

  // Validate returned items structure and no sensitive fields
  for (const item of pageAll.data) {
    TestValidator.predicate(
      "item has id (uuid)",
      typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      "item has email",
      typeof item.email === "string" && item.email.includes("@"),
    );
    TestValidator.predicate(
      "item has is_super boolean",
      typeof item.is_super === "boolean",
    );
    TestValidator.predicate(
      "created_at is present",
      item.created_at !== null &&
        item.created_at !== undefined &&
        typeof item.created_at === "string",
    );
    TestValidator.predicate(
      "last_active_at is string or null",
      item.last_active_at === null || typeof item.last_active_at === "string",
    );
    // Robust check for sensitive field absence
    TestValidator.predicate(
      "password_hash not present on item",
      Object.prototype.hasOwnProperty.call(item, "password_hash") === false,
    );
  }

  // 4) Filter by is_super = true
  const pageSuper: IPageITodoAppAdmin.ISummary =
    await api.functional.todoApp.admin.admins.index(connection, {
      body: {
        page: 1,
        pageSize: 10,
        is_super: true,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppAdmin.IRequest,
    });
  typia.assert(pageSuper);
  TestValidator.predicate(
    "all returned items have is_super true",
    pageSuper.data.every((d) => d.is_super === true),
  );

  // 5) Pagination small pageSize (pageSize = 1)
  const pageSingle: IPageITodoAppAdmin.ISummary =
    await api.functional.todoApp.admin.admins.index(connection, {
      body: {
        page: 1,
        pageSize: 1,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppAdmin.IRequest,
    });
  typia.assert(pageSingle);
  TestValidator.equals(
    "page limit should be 1",
    pageSingle.pagination.limit,
    1,
  );

  // 6) Sorting behaviour: validate created_at ordering explicitly
  // Descending list (pageAll) -> ensure each created_at is >= next created_at
  if (pageAll.data.length >= 2) {
    for (let i = 0; i < pageAll.data.length - 1; ++i) {
      const cur = Date.parse(pageAll.data[i].created_at!);
      const next = Date.parse(pageAll.data[i + 1].created_at!);
      TestValidator.predicate("created_at desc ordering", cur >= next);
    }
  }

  // Ascending
  const pageAsc: IPageITodoAppAdmin.ISummary =
    await api.functional.todoApp.admin.admins.index(connection, {
      body: {
        page: 1,
        pageSize: 10,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ITodoAppAdmin.IRequest,
    });
  typia.assert(pageAsc);
  if (pageAsc.data.length >= 2) {
    for (let i = 0; i < pageAsc.data.length - 1; ++i) {
      const cur = Date.parse(pageAsc.data[i].created_at!);
      const next = Date.parse(pageAsc.data[i + 1].created_at!);
      TestValidator.predicate("created_at asc ordering", cur <= next);
    }
  }

  // 7) Invalid request: page = 0 should lead to 400
  await TestValidator.httpError(
    "invalid pagination should return 400",
    400,
    async () =>
      await api.functional.todoApp.admin.admins.index(connection, {
        body: {
          page: 0,
          pageSize: 10,
        } satisfies ITodoAppAdmin.IRequest,
      }),
  );

  // 8) Unauthenticated call should return 401 or 403
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "unauthenticated admin access should be rejected",
    [401, 403],
    async () =>
      await api.functional.todoApp.admin.admins.index(unauthConn, {
        body: {
          page: 1,
          pageSize: 10,
        } satisfies ITodoAppAdmin.IRequest,
      }),
  );

  // 9) Rate-limit best-effort test: attempt many concurrent calls and expect 429
  // Note: This is best-effort; if server does not enforce 429 the test will fail accordingly.
  await TestValidator.httpError(
    "heavy concurrent requests may trigger 429",
    429,
    async () => {
      await Promise.all(
        ArrayUtil.repeat(20, () =>
          api.functional.todoApp.admin.admins.index(connection, {
            body: {
              page: 1,
              pageSize: 10,
            } satisfies ITodoAppAdmin.IRequest,
          }),
        ),
      );
    },
  );
}
