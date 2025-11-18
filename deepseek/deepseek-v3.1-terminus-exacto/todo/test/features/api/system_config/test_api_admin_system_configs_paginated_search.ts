import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSystemConfig";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test an authenticated admin's ability to retrieve a paginated and filtered
 * list of system configuration records.
 *
 * 1. Register a new admin using the join endpoint.
 * 2. Perform a default systemConfigs paginated search (no filters) and verify
 *    structure.
 * 3. Perform filtered search by key and value.
 * 4. Perform filtered search with created_from/created_to and
 *    updated_from/updated_to.
 * 5. Perform search with pagination (use limit and page) and check pagination
 *    structure.
 * 6. Test with include_deleted=true to include soft-deleted records.
 * 7. Test various sort_by (key, created_at, updated_at) and order combinations.
 * 8. Confirm all summary records contain valid created_at, updated_at, and
 *    (possibly null) deleted_at fields.
 * 9. Attempt access as unauthenticated user and validate it is forbidden.
 */
export async function test_api_admin_system_configs_paginated_search(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: { email, password } satisfies ITodoListAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Default unfiltered search
  let page = await api.functional.todoList.admin.systemConfigs.index(
    connection,
    {
      body: {} satisfies ITodoListSystemConfig.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "valid pagination object",
    typeof page.pagination,
    "object",
  );
  TestValidator.predicate("data is array", Array.isArray(page.data));

  // 3. Filter by key/value if there is at least one config
  if (page.data.length > 0) {
    const config = page.data[0];
    // By key
    const pageByKey = await api.functional.todoList.admin.systemConfigs.index(
      connection,
      {
        body: { key: config.key } satisfies ITodoListSystemConfig.IRequest,
      },
    );
    typia.assert(pageByKey);
    TestValidator.predicate(
      "all configs match key",
      pageByKey.data.every((c) => c.key === config.key),
    );
    // By value
    const pageByValue = await api.functional.todoList.admin.systemConfigs.index(
      connection,
      {
        body: { value: config.value } satisfies ITodoListSystemConfig.IRequest,
      },
    );
    typia.assert(pageByValue);
    TestValidator.predicate(
      "all configs match value",
      pageByValue.data.every((c) => c.value === config.value),
    );
  }

  // 4. Filter by created/updated_at if there is at least one config
  if (page.data.length > 0) {
    const config = page.data[0];
    const pageByCreated =
      await api.functional.todoList.admin.systemConfigs.index(connection, {
        body: {
          created_from: config.created_at,
          created_to: config.created_at,
        } satisfies ITodoListSystemConfig.IRequest,
      });
    typia.assert(pageByCreated);
    TestValidator.predicate(
      "all configs created_at equals filter",
      pageByCreated.data.every((c) => c.created_at === config.created_at),
    );

    const pageByUpdated =
      await api.functional.todoList.admin.systemConfigs.index(connection, {
        body: {
          updated_from: config.updated_at,
          updated_to: config.updated_at,
        } satisfies ITodoListSystemConfig.IRequest,
      });
    typia.assert(pageByUpdated);
    TestValidator.predicate(
      "all configs updated_at equals filter",
      pageByUpdated.data.every((c) => c.updated_at === config.updated_at),
    );
  }

  // 5. Pagination: limit/page logic
  const paged = await api.functional.todoList.admin.systemConfigs.index(
    connection,
    {
      body: { limit: 1, page: 1 } satisfies ITodoListSystemConfig.IRequest,
    },
  );
  typia.assert(paged);
  TestValidator.equals(
    "pagination limit honored",
    paged.data.length,
    Math.min(paged.pagination.limit, paged.pagination.records, 1),
  );
  if (paged.pagination.pages > 1) {
    const nextPage = await api.functional.todoList.admin.systemConfigs.index(
      connection,
      {
        body: { limit: 1, page: 2 } satisfies ITodoListSystemConfig.IRequest,
      },
    );
    typia.assert(nextPage);
    TestValidator.equals(
      "pagination page advanced",
      nextPage.pagination.current,
      2,
    );
  }

  // 6. include_deleted: request both with and without
  const normalPage = await api.functional.todoList.admin.systemConfigs.index(
    connection,
    {
      body: { include_deleted: false } satisfies ITodoListSystemConfig.IRequest,
    },
  );
  typia.assert(normalPage);
  TestValidator.predicate(
    "normalPage doesn't include deleted_at",
    normalPage.data.every((c) => !c.deleted_at),
  );
  const deletedPage = await api.functional.todoList.admin.systemConfigs.index(
    connection,
    {
      body: { include_deleted: true } satisfies ITodoListSystemConfig.IRequest,
    },
  );
  typia.assert(deletedPage);
  // May include deleted_at set, but not guaranteed. Just check property exists.
  TestValidator.predicate(
    "deletedPage may have configs with deleted_at present",
    deletedPage.data.some(
      (c) => c.deleted_at !== null && c.deleted_at !== undefined,
    ) || deletedPage.data.length === 0,
  );

  // 7. Try various sort options (key, created_at, updated_at) and orders
  const sortCols = ["key", "created_at", "updated_at"] as const;
  const orders = ["asc", "desc"] as const;
  for (const col of sortCols)
    for (const ord of orders) {
      const sorted = await api.functional.todoList.admin.systemConfigs.index(
        connection,
        {
          body: {
            sort_by: col,
            order: ord,
          } satisfies ITodoListSystemConfig.IRequest,
        },
      );
      typia.assert(sorted);
      // Just verify valid structure and data presence
      TestValidator.equals(
        `sorted by ${col} ${ord}: valid data array`,
        Array.isArray(sorted.data),
        true,
      );
      // Optionally check data ordering for non-empty sets
      if (sorted.data.length > 1) {
        const field = col;
        const compare = (
          a: ITodoListSystemConfig.ISummary,
          b: ITodoListSystemConfig.ISummary,
        ) => {
          if (a[field] < b[field]) return ord === "asc" ? -1 : 1;
          if (a[field] > b[field]) return ord === "asc" ? 1 : -1;
          return 0;
        };
        for (let i = 1; i < sorted.data.length; ++i)
          TestValidator.predicate(
            `sorted by ${field} ${ord} at index ${i}`,
            compare(sorted.data[i - 1], sorted.data[i]) <= 0,
          );
      }
    }

  // 8. Validate audit fields on all returned summary entries
  for (const entry of page.data) {
    TestValidator.predicate(
      "created_at valid ISO",
      typeof entry.created_at === "string" && entry.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at valid ISO",
      typeof entry.updated_at === "string" && entry.updated_at.length > 0,
    );
    // deleted_at can be null/undefined or ISO string
    if (entry.deleted_at !== undefined && entry.deleted_at !== null)
      TestValidator.predicate(
        "deleted_at, if present, is non-empty string",
        typeof entry.deleted_at === "string" && entry.deleted_at.length > 0,
      );
  }

  // 9. Try as unauthenticated (fresh) connection and expect forbidden
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access is not allowed", async () => {
    await api.functional.todoList.admin.systemConfigs.index(unauthConn, {
      body: {} satisfies ITodoListSystemConfig.IRequest,
    });
  });
}
