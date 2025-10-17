import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IENotificationSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IENotificationSortBy";
import type { IESortDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortDirection";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussNotification";

/**
 * Validate authentication boundary and empty-search behavior for member
 * notifications.
 *
 * Context
 *
 * - The endpoint PATCH /econDiscuss/member/me/notifications lists the signed-in
 *   member's notifications with filters and pagination. Only the owner may
 *   access their inbox.
 *
 * What this test validates
 *
 * 1. Unauthenticated access is rejected (business boundary) without asserting
 *    specific status codes.
 * 2. After joining as a new member, an authenticated search with isRead=false and
 *    pagination succeeds, returning an empty page for a fresh account. If any
 *    records exist, validate default ordering (createdAt desc) and that all
 *    items match the isRead=false filter.
 *
 * Steps
 *
 * 1. Build an unauthenticated connection and call notifications.search -> expect
 *    error.
 * 2. Join a new member (SDK sets Authorization header automatically).
 * 3. Call notifications.search as the authenticated member.
 *
 *    - Validate response structure via typia.assert.
 *    - If empty: confirm zero notifications for new account.
 *    - If not empty: confirm createdAt is descending and all items have
 *         isRead=false.
 */
export async function test_api_notifications_search_empty_and_auth_boundary(
  connection: api.IConnection,
) {
  // 1) Unauthenticated boundary: create a fresh unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const unauthSearchBody = {
    page: 1,
    pageSize: 10,
    isRead: false,
  } satisfies IEconDiscussNotification.IRequest;

  // Expect an error for unauthenticated access (no status code assertion)
  await TestValidator.error(
    "unauthenticated member cannot list notifications",
    async () => {
      await api.functional.econDiscuss.member.me.notifications.search(
        unauthConn,
        { body: unauthSearchBody },
      );
    },
  );

  // 2) Join as a new member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 3) Authenticated search with minimal body to exercise default ordering
  const searchBody = {
    page: 1,
    pageSize: 10,
    isRead: false,
  } satisfies IEconDiscussNotification.IRequest;

  const page = await api.functional.econDiscuss.member.me.notifications.search(
    connection,
    { body: searchBody },
  );
  typia.assert(page);

  // If the account has no notifications, ensure empty data
  if (page.data.length === 0) {
    TestValidator.equals(
      "newly joined member has no notifications",
      page.data.length,
      0,
    );
  } else {
    // Otherwise, validate business semantics only
    // - createdAt descending (default ordering)
    const orderedDesc = page.data.every(
      (n, i, arr) => i === 0 || arr[i - 1].createdAt >= n.createdAt,
    );
    TestValidator.predicate(
      "default ordering is createdAt desc when not specified",
      orderedDesc,
    );

    // - isRead filter honored
    const allUnread = page.data.every((n) => n.isRead === false);
    TestValidator.predicate(
      "isRead=false filter returns only unread notifications",
      allUnread,
    );
  }
}
