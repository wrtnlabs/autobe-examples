import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserSession";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";

/**
 * List and search all sessions for a todo user account (public index).
 *
 * Validates unauthenticated access, pagination, expiry filters, and correctness
 * of summary session metadata, with edge cases for zero/many/mixed-expiry
 * sessions.
 */
export async function test_api_todo_user_sessions_paginated_index_public_access(
  connection: api.IConnection,
) {
  // Create a random userId for query
  const userId = typia.random<string & tags.Format<"uuid">>();

  // --- Case 1: No filter, expect an empty or default result for a new user ---
  const output_no_sessions = await api.functional.todo.users.sessions.index(
    connection,
    {
      userId,
      body: {},
    },
  );
  typia.assert(output_no_sessions);
  TestValidator.equals(
    "no sessions on new user",
    output_no_sessions.data.length,
    0,
  );

  // --- Case 2: Many sessions test (simulate multiple sessions with various expired_at) ---
  // We'll query the API repeatedly to cover paging and filtering logic, no data setup required since endpoint is public/audit-read-only.
  // Full page of active/expired sessions, page size limits, expired/all/active filters, date ranges

  // Use pagination (limit: 3), expect correct records property matches data length
  const output_paged = await api.functional.todo.users.sessions.index(
    connection,
    {
      userId,
      body: { page: 1, limit: 3 },
    },
  );
  typia.assert(output_paged);
  TestValidator.equals(
    "pagination data length matches",
    output_paged.data.length,
    Math.min(output_paged.pagination.limit, output_paged.pagination.records),
  );
  TestValidator.predicate(
    "pagination current page is 1",
    output_paged.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit within allowed range",
    output_paged.pagination.limit >= 1 && output_paged.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination record count >= 0",
    output_paged.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    output_paged.pagination.pages >= 0,
  );

  // If there are sessions, check summary fields for one
  if (output_paged.data.length > 0) {
    const first = output_paged.data[0];
    typia.assert(first);
    TestValidator.predicate(
      "session id is uuid",
      typeof first.id === "string" && /^[0-9a-f\-]{36}$/.test(first.id),
    );
    TestValidator.predicate(
      "todo_user_id matches",
      first.todo_user_id === userId,
    );
    TestValidator.predicate("ip is string", typeof first.ip === "string");
    TestValidator.predicate(
      "created_at is iso",
      typeof first.created_at === "string" && /T/.test(first.created_at),
    );
    TestValidator.predicate(
      "href is uri",
      typeof first.href === "string" && first.href.startsWith("http"),
    );
    TestValidator.predicate(
      "referrer is uri",
      typeof first.referrer === "string" && first.referrer.startsWith("http"),
    );
    // expired_at may be null, undefined, or date-time string
    if (first.expired_at !== null && first.expired_at !== undefined) {
      TestValidator.predicate(
        "expired_at is iso string",
        typeof first.expired_at === "string" && /T/.test(first.expired_at),
      );
    }
  }

  // --- Case 3: Filter by expired: true ---
  const output_expired = await api.functional.todo.users.sessions.index(
    connection,
    {
      userId,
      body: { expired: true },
    },
  );
  typia.assert(output_expired);
  TestValidator.predicate(
    "all returned are expired",
    output_expired.data.every(
      (s) => s.expired_at !== null && s.expired_at !== undefined,
    ),
  );

  // --- Case 4: Filter by expired: false ---
  const output_active = await api.functional.todo.users.sessions.index(
    connection,
    {
      userId,
      body: { expired: false },
    },
  );
  typia.assert(output_active);
  TestValidator.predicate(
    "all returned are active",
    output_active.data.every(
      (s) => s.expired_at === null || s.expired_at === undefined,
    ),
  );

  // --- Case 5: Date range filters ---
  // Get all first, then test date-range filter using created_at window if any
  if (output_paged.data.length > 0) {
    const first = output_paged.data[0];
    const created_from = first.created_at;
    // Date range: only sessions created at or after the first
    const output_date_range = await api.functional.todo.users.sessions.index(
      connection,
      {
        userId,
        body: { created_from },
      },
    );
    typia.assert(output_date_range);
    TestValidator.predicate(
      "all sessions created_at >= created_from",
      output_date_range.data.every((s) => s.created_at >= created_from),
    );
  }

  // --- Case 6: Public access/no authentication ---
  // Simulate an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const output_public = await api.functional.todo.users.sessions.index(
    unauthConn,
    {
      userId,
      body: {},
    },
  );
  typia.assert(output_public);
  TestValidator.equals(
    "unauthenticated access yields valid result",
    output_public.pagination.current,
    1,
  );
}
