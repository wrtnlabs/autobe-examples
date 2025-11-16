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
 * Test filtering notifications by specific notification_type.
 *
 * This test validates that the notification retrieval API correctly filters
 * notifications based on the notification_type parameter. The test creates a
 * member account and then systematically tests each supported notification type
 * to ensure proper filtering and response structure.
 *
 * Steps:
 *
 * 1. Create and authenticate a member account
 * 2. Test notification retrieval with each notification_type enum value
 * 3. Validate response structure and pagination metadata
 * 4. Verify type filtering works correctly when notifications exist
 */
export async function test_api_notification_retrieval_by_type(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 2: Define all supported notification types
  const notificationTypes = [
    "comment_reply",
    "post_reply",
    "content_removed",
    "user_banned",
    "ban_expired",
    "ban_lifted",
    "appeal_approved",
    "appeal_denied",
    "report_resolved",
    "upvote_milestone",
  ] as const;

  // Step 3: Test each notification type filter
  for (const notificationType of notificationTypes) {
    const response: IPageIRedditCommunityNotification.ISummary =
      await api.functional.redditCommunity.member.notifications.index(
        connection,
        {
          body: {
            type: notificationType,
            page: 1,
            limit: 10,
          } satisfies IRedditCommunityNotification.IRequest,
        },
      );

    typia.assert(response);

    // Step 4: Validate pagination structure
    TestValidator.predicate(
      `pagination metadata exists for ${notificationType}`,
      response.pagination !== null && response.pagination !== undefined,
    );

    TestValidator.predicate(
      `data array exists for ${notificationType}`,
      Array.isArray(response.data),
    );

    // Step 5: If notifications exist, verify they match the requested type
    if (response.data.length > 0) {
      for (const notification of response.data) {
        TestValidator.equals(
          `notification type matches filter for ${notificationType}`,
          notification.notification_type,
          notificationType,
        );
      }
    }
  }

  // Step 6: Test without type filter to ensure API works without filtering
  const allNotifications: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );

  typia.assert(allNotifications);

  // Step 7: Validate that different types can coexist when no filter is applied
  TestValidator.predicate(
    "unfiltered notifications return valid response",
    allNotifications.pagination !== null &&
      allNotifications.pagination !== undefined,
  );
}
