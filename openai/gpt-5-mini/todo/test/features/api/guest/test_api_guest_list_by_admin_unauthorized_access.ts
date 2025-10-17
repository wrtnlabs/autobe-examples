import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

export async function test_api_guest_list_by_admin_unauthorized_access(
  connection: api.IConnection,
) {
  // Negative test: verify admin guest-list endpoint rejects unauthorized callers.
  // Strategy:
  // - Send a valid (but minimal) request body using the exact DTO type.
  // - Do NOT mutate connection.headers; use the provided connection as-is (assumed unauthenticated).
  // - Expect the call to fail with 401 or 403. Use TestValidator.httpError to assert HTTP error.

  // Prepare a minimal valid request body. All fields in ITodoAppGuest.IRequest are optional.
  const requestBody = {} satisfies ITodoAppGuest.IRequest;

  // Because the callback is async, we MUST await TestValidator.httpError.
  await TestValidator.httpError(
    "admin guest-list must reject unauthorized caller",
    [401, 403],
    async () => {
      // Attempt to call the admin-only endpoint without authentication.
      await api.functional.todoApp.admin.guests.index(connection, {
        body: requestBody,
      });
    },
  );
}
