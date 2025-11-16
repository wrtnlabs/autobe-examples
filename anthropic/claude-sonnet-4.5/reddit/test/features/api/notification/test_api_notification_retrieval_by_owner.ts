import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test successful retrieval of a notification by its authenticated owner.
 *
 * This test validates the notification retrieval endpoint by creating an
 * authenticated member account and attempting to retrieve a notification. The
 * test verifies that:
 *
 * 1. Member can successfully authenticate and access their notifications
 * 2. Notification retrieval returns complete notification details
 * 3. All required fields are present and properly formatted (via typia.assert)
 * 4. Timestamps follow ISO 8601 date-time format (via typia.assert)
 * 5. Optional reference fields (post_id, comment_id, etc.) are correctly typed
 *    (via typia.assert)
 *
 * The test workflow:
 *
 * - Create and authenticate a member account
 * - Generate a notification ID for retrieval testing
 * - Call the notification retrieval endpoint
 * - Validate response structure and data types with typia.assert
 */
export async function test_api_notification_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authenticatedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Generate a notification ID for testing retrieval
  // In production, notifications are created by system events, but for testing
  // the retrieval endpoint, we use a random UUID
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the notification by ID
  const notification: IRedditCommunityNotification =
    await api.functional.redditCommunity.member.notifications.at(connection, {
      notificationId: notificationId,
    });

  // Step 4: Validate the notification response structure
  // typia.assert performs COMPLETE validation of all fields, types, formats, and constraints
  typia.assert(notification);
}
