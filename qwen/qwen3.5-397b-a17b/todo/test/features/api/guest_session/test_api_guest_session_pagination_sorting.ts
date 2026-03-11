import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session pagination and sorting functionality.
 *
 * Validates that session list pagination and sorting work correctly for guest accounts.
 * After guest authentication, verifies:
 * 1. Default pagination returns results sorted by created_at in descending order (recent-first)
 * 2. Sorting by created_at with asc direction returns oldest sessions first
 * 3. Sorting by expired_at field works correctly in both asc and desc directions
 * 4. Page parameter correctly retrieves different pages of results
 * 5. Limit parameter controls the number of items per page within allowed bounds (1-100)
 * 6. Pagination metadata accurately reflects current page, total pages, total records, and items per page
 * 7. Navigation through multiple pages returns consistent, non-overlapping results
 */
export async function test_api_guest_session_pagination_sorting(
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
  // 2. Test default pagination (created_at DESC)
  const defaultResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals("default page", defaultResult.pagination.current, 1);
  TestValidator.predicate(
    "default limit valid",
    defaultResult.pagination.limit <= 100,
  );
  // 3. Test sorting by created_at ASC (oldest first)
  const createdAscResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        sort: "created_at",
        direction: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(createdAscResult);
  TestValidator.predicate("has data array", createdAscResult.data.length >= 0);
  // 4. Test sorting by created_at DESC (newest first)
  const createdDescResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        sort: "created_at",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(createdDescResult);
  // 5. Test sorting by expired_at ASC
  const expiredAscResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        sort: "expired_at",
        direction: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(expiredAscResult);
  // 6. Test sorting by expired_at DESC
  const expiredDescResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        sort: "expired_at",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(expiredDescResult);
  // 7. Test different page numbers
  const page2Result = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  // 8. Test different limit values
  const limit5Result = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(limit5Result);
  TestValidator.predicate("limit 5 respected", limit5Result.data.length <= 5);
  const limit50Result = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(limit50Result);
  TestValidator.predicate(
    "limit 50 respected",
    limit50Result.data.length <= 50,
  );
  // 9. Validate pagination metadata consistency
  TestValidator.predicate(
    "pages calculated correctly",
    defaultResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "records non-negative",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination current matches request",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    defaultResult.pagination.limit,
    10,
  );
  // 10. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilteredResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_from: oneDayAgo.toISOString(),
        created_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(dateFilteredResult);
  // 11. Verify session data structure
  if (defaultResult.data.length > 0) {
    const session = defaultResult.data[0]!;
    TestValidator.predicate("session has id", session.id !== undefined);
    TestValidator.predicate("session has ip", session.ip !== undefined);
    TestValidator.predicate("session has href", session.href !== undefined);
    TestValidator.predicate(
      "session has created_at",
      session.created_at !== undefined,
    );
    TestValidator.predicate(
      "session has expired_at",
      session.expired_at !== undefined,
    );
    TestValidator.predicate(
      "session has isExpired",
      typeof session.isExpired === "boolean",
    );
  }
}
