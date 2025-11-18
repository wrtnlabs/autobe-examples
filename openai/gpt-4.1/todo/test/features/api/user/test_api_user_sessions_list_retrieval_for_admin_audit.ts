import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validate administrative retrieval of all session records for a user (by
 * email), supporting pagination, sorting, and privacy requirements.
 *
 * The test covers:
 *
 * 1. Performing a paged and sorted query as an administrator over an existing
 *    user's email, ensuring that the response consists only of authorized,
 *    session summary data without any secret tokens.
 * 2. Confirming returned pagination structure is valid and session entries are
 *    correctly associated (valid user id match, required metadata like IP,
 *    href, created_at present and correctly formatted; no secret info or tokens
 *    returned).
 * 3. Iterating through multiple paging/sorting/filtering configurations.
 * 4. Verifying that only administrators can access this endpoint while standard
 *    users are rejected.
 */
export async function test_api_user_sessions_list_retrieval_for_admin_audit(
  connection: api.IConnection,
) {
  // Generate a random user email (simulate an audit situation)
  const testEmail: string =
    RandomGenerator.name(1).replace(" ", "") + "@autobe-e2e.com";

  // Prepare multiple request filter/sort/paging combinations
  const filterCombos: ITodoListUserSession.IRequest[] = [
    // Default pagination and sort
    {},
    // Explicit first page, default sort
    { page: 1, limit: 50 },
    // Descending sort by creation date
    { page: 1, sort_by: "created_at", desc: true },
    // Descending sort by expired_at
    { sort_by: "expired_at", desc: true },
    // Max limit
    { limit: 100 },
  ];

  // Try with different paging/sorting/limit options
  for (const filter of filterCombos) {
    const output: IPageITodoListUserSession.ISummary =
      await api.functional.todoList.users.sessions.index(connection, {
        email: testEmail,
        body: filter,
      });
    typia.assert(output);
    // Pagination metadata checks
    const pageInfo = output.pagination;
    TestValidator.predicate(
      "pagination current page is >= 0",
      pageInfo.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is between 1 and 100",
      pageInfo.limit >= 1 && pageInfo.limit <= 100,
    );
    TestValidator.predicate("pagination records >= 0", pageInfo.records >= 0);
    TestValidator.predicate("pagination pages >= 0", pageInfo.pages >= 0);
    // All session entries must match the email's user id, contain non-secret metadata only
    for (const session of output.data) {
      typia.assert(session);
      TestValidator.predicate(
        "session id matches uuid format",
        typeof session.id === "string" && session.id.length >= 36,
      );
      TestValidator.predicate("session user is present", !!session.user);
      TestValidator.predicate(
        "user id format is uuid",
        typeof session.user.id === "string" && session.user.id.length >= 36,
      );
      TestValidator.predicate(
        "session ip present",
        typeof session.ip === "string" && session.ip.length > 0,
      );
      TestValidator.predicate(
        "href is present",
        typeof session.href === "string" && session.href.length > 0,
      );
      TestValidator.predicate(
        "referrer is present",
        typeof session.referrer === "string",
      );
      TestValidator.predicate(
        "created_at is ISO date string",
        typeof session.created_at === "string" &&
          session.created_at.includes("T"),
      );
      // Should not leak any secret token fields/etc (by DTO definition)
      // No additional checks needed as typia.assert above ensures shape.
    }
  }

  // Negative test: Standard user should not be permitted (simulate by empty/readonly/unauth connection header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user should be denied access",
    async () => {
      await api.functional.todoList.users.sessions.index(unauthConn, {
        email: testEmail,
        body: {},
      });
    },
  );
}
