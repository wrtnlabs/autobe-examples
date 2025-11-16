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
 * Test notification retrieval when no notifications exist.
 *
 * This test validates that the notification retrieval API correctly handles
 * empty result sets. It creates a new member account with no notifications,
 * retrieves the notification list, and verifies that the response structure is
 * valid with empty data, zero pagination counts, and proper metadata.
 *
 * Steps:
 *
 * 1. Create a new member account (will have no notifications)
 * 2. Retrieve notification list without filters
 * 3. Verify empty data array
 * 4. Verify pagination metadata shows zero records and pages
 * 5. Test various filter combinations that should return empty results
 * 6. Validate response structure remains consistent
 */
export async function test_api_notification_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with no notifications
  const newMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "127.0.0.1",
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(newMember);

  // Step 2: Retrieve notification list without filters (should be empty)
  const emptyResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {} satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(emptyResult);

  // Step 3: Verify empty data array
  TestValidator.equals("empty notifications data array", emptyResult.data, []);

  // Step 4: Verify pagination metadata shows zero records and pages
  TestValidator.equals(
    "pagination current page",
    emptyResult.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination total records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    emptyResult.pagination.limit >= 0,
  );

  // Step 5: Test with specific notification type filter (should still be empty)
  const typeFilterResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          type: "comment_reply",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(typeFilterResult);
  TestValidator.equals(
    "filtered by type: empty data",
    typeFilterResult.data,
    [],
  );
  TestValidator.equals(
    "filtered by type: zero records",
    typeFilterResult.pagination.records,
    0,
  );

  // Step 6: Test with unread filter (should be empty)
  const unreadFilterResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          is_read: false,
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(unreadFilterResult);
  TestValidator.equals(
    "filtered by unread: empty data",
    unreadFilterResult.data,
    [],
  );
  TestValidator.equals(
    "filtered by unread: zero records",
    unreadFilterResult.pagination.records,
    0,
  );

  // Step 7: Test with date range filter (should be empty)
  const now = new Date();
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFilterResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          created_after: pastDate.toISOString(),
          created_before: now.toISOString(),
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(dateFilterResult);
  TestValidator.equals(
    "filtered by date range: empty data",
    dateFilterResult.data,
    [],
  );
  TestValidator.equals(
    "filtered by date range: zero records",
    dateFilterResult.pagination.records,
    0,
  );

  // Step 8: Test with combined filters (should be empty)
  const combinedFilterResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          type: "post_reply",
          is_read: false,
          created_after: pastDate.toISOString(),
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filters: empty data",
    combinedFilterResult.data,
    [],
  );
  TestValidator.equals(
    "combined filters: zero records",
    combinedFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters: zero pages",
    combinedFilterResult.pagination.pages,
    0,
  );
}
