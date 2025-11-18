import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

/**
 * Validate date range filtering when listing guest users.
 *
 * Business goal
 *
 * - Ensure operators can slice guest cohorts by creation time using PATCH
 *   /todoApp/guestUser/guestUsers.
 * - Confirm that both created_from (lower bound) and created_to (upper bound) are
 *   applied inclusively and that results never leak outside the window.
 *
 * Test steps
 *
 * 1. Join as a guest user via POST /auth/guestUser/join to obtain
 *    ITodoAppGuestUser.IAuthorized and let the SDK install the token in the
 *    shared connection.
 * 2. Capture the guest user created_at timestamp from the join response.
 * 3. Construct a [from, to] window around that timestamp:
 *
 *    - From: a bit before created_at (for example, created_at minus 5 minutes).
 *    - To: a bit after created_at (for example, created_at plus 5 minutes). All
 *         values must be ISO 8601 strings as required by
 *         ITodoAppGuestUser.IRequest.created_from/created_to.
 * 4. Call api.functional.todoApp.guestUser.guestUsers.index with an
 *    ITodoAppGuestUser.IRequest body that sets:
 *
 *    - Page: 1
 *    - Limit: a small int32 like 10
 *    - Created_from: from
 *    - Created_to: to
 *    - Order_by/order_direction may be omitted so that server defaults apply.
 * 5. Assert the response type using
 *    typia.assert<IPageITodoAppGuestuser.ISummary>(...).
 * 6. For each ITodoAppGuestUser.ISummary in output.data, assert:
 *
 *    - Created_at >= from
 *    - Created_at <= to using Date comparisons and TestValidator.predicate with
 *         descriptive titles.
 * 7. For stronger validation of the upper bound, perform a second list call with a
 *    non-overlapping window that is strictly before the guest's created_at (for
 *    example, [created_at minus 30 minutes, created_at minus 20 minutes]).
 *    Assert that output.data.length === 0 using TestValidator.equals.
 *
 * Implementation notes
 *
 * - Use only the provided imports, especially typia and RandomGenerator if
 *   needed, but keep the test deterministic by basing the window on the actual
 *   created_at value from ITodoAppGuestUser.IAuthorized.
 * - ITodoAppGuestUser.IRequest is used only as the request body type, while
 *   IPageITodoAppGuestuser.ISummary and ITodoAppGuestUser.ISummary describe the
 *   paginated response.
 * - Be careful to use Date.toISOString() for all derived timestamps so they match
 *   string & tags.Format<"date-time">.
 */
export async function test_api_guest_user_list_with_creation_date_range_filter(
  connection: api.IConnection,
) {
  // 1. Join as a guest user and obtain authorization context
  const authorized = await api.functional.auth.guestUser.join(connection, {
    body: {},
  });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);

  // 2. Capture created_at and parse into Date
  const createdAt = new Date(authorized.created_at);

  // 3. Build an inclusive [from, to] window around created_at
  const fiveMinutesMs = 5 * 60 * 1000;
  const from = new Date(createdAt.getTime() - fiveMinutesMs).toISOString();
  const to = new Date(createdAt.getTime() + fiveMinutesMs).toISOString();

  // 4. Call the listing endpoint with the window
  const inRangePage = await api.functional.todoApp.guestUser.guestUsers.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        created_from: from,
        created_to: to,
      } satisfies ITodoAppGuestUser.IRequest,
    },
  );
  typia.assert<IPageITodoAppGuestuser.ISummary>(inRangePage);

  // 5. Validate every record falls within [from, to] inclusively
  const fromDate = new Date(from);
  const toDate = new Date(to);

  for (const summary of inRangePage.data) {
    const createdAtSummary = new Date(summary.created_at);

    TestValidator.predicate(
      "guest user created_at should be on or after created_from",
      createdAtSummary.getTime() >= fromDate.getTime(),
    );
    TestValidator.predicate(
      "guest user created_at should be on or before created_to",
      createdAtSummary.getTime() <= toDate.getTime(),
    );
  }

  // 6. Build a non-overlapping window entirely before the guest's created_at
  const thirtyMinutesMs = 30 * 60 * 1000;
  const twentyMinutesMs = 20 * 60 * 1000;
  const beforeFrom = new Date(
    createdAt.getTime() - thirtyMinutesMs,
  ).toISOString();
  const beforeTo = new Date(
    createdAt.getTime() - twentyMinutesMs,
  ).toISOString();

  const beforePage = await api.functional.todoApp.guestUser.guestUsers.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        created_from: beforeFrom,
        created_to: beforeTo,
      } satisfies ITodoAppGuestUser.IRequest,
    },
  );
  typia.assert<IPageITodoAppGuestuser.ISummary>(beforePage);

  TestValidator.equals(
    "non-overlapping created_at window should return no guest users",
    beforePage.data.length,
    0,
  );
}
