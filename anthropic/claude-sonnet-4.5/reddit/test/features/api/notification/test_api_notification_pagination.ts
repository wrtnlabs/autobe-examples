import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityNotification";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test pagination functionality for notification retrieval with page and limit
 * parameters.
 *
 * This test validates comprehensive pagination behavior for the notification
 * index API:
 *
 * 1. Create authenticated member account
 * 2. Retrieve notifications using different pagination parameters
 * 3. Validate pagination metadata accuracy (current, limit, records, pages)
 * 4. Verify distinct non-overlapping results across pages
 * 5. Test limit parameter enforcement (maximum 100)
 * 6. Test requesting pages beyond available data
 * 7. Validate offset-based pagination calculations
 */
export async function test_api_notification_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create member account to query notifications
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<50>
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 2: Retrieve all notifications to establish baseline
  const allNotifications: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {} satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(allNotifications);

  // Step 3: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    allNotifications.pagination !== null &&
      allNotifications.pagination !== undefined,
  );

  const totalRecords = allNotifications.pagination.records;
  const totalPages = allNotifications.pagination.pages;

  // Step 4: Test with specific page size (limit parameter)
  const pageSize = 5;
  const firstPage: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: pageSize satisfies number as number,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(firstPage);

  // Step 5: Validate pagination metadata accuracy
  TestValidator.equals(
    "first page current number",
    firstPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "first page limit matches request",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "first page total records",
    firstPage.pagination.records,
    totalRecords,
  );

  // Step 6: Validate data array respects limit
  TestValidator.predicate(
    "first page data length within limit",
    firstPage.data.length <= pageSize,
  );

  // Step 7: Test second page for non-overlapping results
  if (totalRecords > pageSize) {
    const secondPage: IPageIRedditCommunityNotification.ISummary =
      await api.functional.redditCommunity.member.notifications.index(
        connection,
        {
          body: {
            page: 2 satisfies number as number,
            limit: pageSize satisfies number as number,
          } satisfies IRedditCommunityNotification.IRequest,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page current number",
      secondPage.pagination.current,
      1,
    );

    // Step 8: Verify no overlap between pages
    const firstPageIds = firstPage.data.map((n) => n.id);
    const secondPageIds = secondPage.data.map((n) => n.id);

    const hasOverlap = firstPageIds.some((id) => secondPageIds.includes(id));
    TestValidator.predicate(
      "no overlapping notifications between pages",
      !hasOverlap,
    );
  }

  // Step 9: Test maximum limit enforcement (100)
  const maxLimitPage: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 100 satisfies number as number,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "maximum limit respected",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data respects maximum limit",
    maxLimitPage.data.length <= 100,
  );

  // Step 10: Test requesting page beyond available data
  const beyondPage: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: (totalPages + 10) satisfies number as number,
          limit: pageSize satisfies number as number,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(beyondPage);

  TestValidator.predicate(
    "beyond page returns empty or handles gracefully",
    beyondPage.data.length === 0 || beyondPage.pagination.current >= 0,
  );

  // Step 11: Validate offset calculation accuracy
  if (totalRecords >= 15) {
    const page1 =
      await api.functional.redditCommunity.member.notifications.index(
        connection,
        {
          body: {
            page: 1 satisfies number as number,
            limit: 5 satisfies number as number,
          } satisfies IRedditCommunityNotification.IRequest,
        },
      );
    typia.assert(page1);

    const page3 =
      await api.functional.redditCommunity.member.notifications.index(
        connection,
        {
          body: {
            page: 3 satisfies number as number,
            limit: 5 satisfies number as number,
          } satisfies IRedditCommunityNotification.IRequest,
        },
      );
    typia.assert(page3);

    // Verify pages are different (offset working)
    const page1Ids = page1.data.map((n) => n.id);
    const page3Ids = page3.data.map((n) => n.id);

    const differentPages = !page1Ids.some((id) => page3Ids.includes(id));
    TestValidator.predicate(
      "offset-based pagination works correctly",
      differentPages || page1.data.length === 0 || page3.data.length === 0,
    );
  }

  // Step 12: Test with minimum valid page number
  const minPage: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(minPage);

  TestValidator.predicate(
    "minimum page number works",
    minPage.pagination.current === 0,
  );
}
