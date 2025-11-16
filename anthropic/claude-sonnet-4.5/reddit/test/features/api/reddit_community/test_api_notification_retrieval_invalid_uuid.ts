import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test error handling when retrieving a non-existent notification.
 *
 * This test validates that the notification retrieval endpoint properly handles
 * requests for notifications that do not exist in the system. It ensures the
 * API returns appropriate error responses when a valid UUID is provided but no
 * corresponding notification record exists.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Attempt to retrieve a notification using a valid UUID that doesn't exist
 * 3. Verify that the API rejects the request with a not found error
 */
export async function test_api_notification_retrieval_invalid_uuid(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Generate a valid UUID that doesn't exist in the system
  const nonExistentNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Verify that the API rejects the non-existent notification
  await TestValidator.error(
    "should reject request for non-existent notification",
    async () => {
      await api.functional.redditCommunity.member.notifications.at(connection, {
        notificationId: nonExistentNotificationId,
      });
    },
  );
}
