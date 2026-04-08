import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test filtering guest session list by creation date range.
 *
 * Validates the date range filtering functionality for guest session management. This test ensures that sessions are correctly filtered based on creation timestamp parameters and that the filtering logic properly handles ISO 8601 date-time format.
 *
 * The test verifies both inclusive date range scenarios - when sessions fall within the specified range and when they fall outside it. Pagination metadata is validated to confirm accurate reflection of filtered results.
 *
 * 1. Authenticate as guest using authorize_guest_join utility function.
 * 2. Query sessions with a date range that includes the current session's creation time.
 * 3. Verify the session is returned and pagination metadata is correct.
 * 4. Query sessions with a date range that excludes the current session.
 * 5. Verify no sessions are returned and pagination shows zero records.
 * 6. Validate ISO 8601 date-time format handling in filter parameters.
 */
export async function test_api_session_list_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Query sessions with date range that includes the current session
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const sessionsInRange = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_from: oneHourAgo.toISOString(),
        created_at_to: oneHourLater.toISOString(),
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessionsInRange);
  // 3. Verify session is returned when within date range
  TestValidator.predicate(
    "session found within date range",
    sessionsInRange.data.length > 0,
  );
  TestValidator.equals(
    "pagination records match data length",
    sessionsInRange.pagination.records,
    sessionsInRange.data.length,
  );
  // 4. Query sessions with date range that excludes the current session
  const farPast = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const farPastEnd = new Date(now.getTime() - 366 * 24 * 60 * 60 * 1000); // 1 year and 1 day ago
  const sessionsOutOfRange = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_from: farPastEnd.toISOString(),
        created_at_to: farPast.toISOString(),
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessionsOutOfRange);
  // 5. Verify no sessions returned when outside date range
  TestValidator.equals(
    "no sessions outside date range",
    sessionsOutOfRange.data.length,
    0,
  );
  TestValidator.equals(
    "pagination shows zero records",
    sessionsOutOfRange.pagination.records,
    0,
  );
  // 6. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is 1",
    sessionsInRange.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    sessionsInRange.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    sessionsInRange.pagination.pages >= 0,
  );
}
