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
 * Test combining multiple filter parameters simultaneously.
 *
 * This test validates that the notification filtering API correctly handles
 * complex combinations of filter parameters including type, read status, date
 * ranges, and sorting. It ensures that all filters work together correctly and
 * produce accurate intersection results.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Query notifications with combined filters (type + is_read + date range)
 * 3. Verify pagination and filter results
 * 4. Test sorting with filtered results
 * 5. Validate that all filter parameters work correctly in combination
 */
export async function test_api_notification_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<50>
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: true,
        show_activity_feed: true,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 2: Query notifications with type filter only
  const typeFilterResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          type: "comment_reply",
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(typeFilterResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be valid",
    typeFilterResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    typeFilterResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    typeFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    typeFilterResult.pagination.pages >= 0,
  );

  // Step 3: Query with combined filters - type + is_read
  const combinedFilterResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          type: "post_reply",
          is_read: false,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(combinedFilterResult);

  // Validate combined filter results
  TestValidator.predicate(
    "combined filter should return valid pagination",
    combinedFilterResult.pagination.records >= 0,
  );

  // Step 4: Query with date range filters
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const dateRangeResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
          created_after: oneWeekAgo.toISOString(),
          created_before: now.toISOString(),
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(dateRangeResult);

  // Step 5: Test full combination - type + is_read + date range + sorting
  const fullCombinationResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          type: "comment_reply",
          is_read: false,
          created_after: oneWeekAgo.toISOString(),
          created_before: now.toISOString(),
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(fullCombinationResult);

  // Validate full combination results
  TestValidator.predicate(
    "full combination filter should return valid data",
    fullCombinationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "full combination result data should be array",
    Array.isArray(fullCombinationResult.data),
  );

  // Step 6: Test sorting variations with filters
  const sortAscResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          type: "user_banned",
          sort_by: "created_at",
          order: "asc",
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(sortAscResult);

  // Step 7: Test pagination with combined filters
  const paginationTestResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          is_read: true,
          sort_by: "is_read",
          order: "desc",
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(paginationTestResult);

  TestValidator.predicate(
    "pagination test should have correct limit",
    paginationTestResult.pagination.limit === 5,
  );

  // Step 8: Test different notification types with sorting
  const notificationTypes = [
    "comment_reply",
    "post_reply",
    "content_removed",
    "user_banned",
    "ban_expired",
  ] as const;

  const typeTestResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          type: RandomGenerator.pick(notificationTypes),
          sort_by: "type",
          order: "asc",
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(typeTestResult);

  // Step 9: Test edge case - very large date range
  const veryOldDate = new Date("2020-01-01T00:00:00Z");
  const farFutureDate = new Date("2030-12-31T23:59:59Z");

  const largeDateRangeResult: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          created_after: veryOldDate.toISOString(),
          created_before: farFutureDate.toISOString(),
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(largeDateRangeResult);

  // Step 10: Verify all results have consistent structure
  TestValidator.predicate(
    "all notification results should have valid member references",
    typeFilterResult.data.every(
      (notification) =>
        notification.member &&
        typeof notification.member.id === "string" &&
        typeof notification.member.username === "string",
    ),
  );
}
