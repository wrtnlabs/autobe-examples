import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test error handling when updating a notification that doesn't exist.
 *
 * This test validates that the system properly returns a not found error when
 * attempting to update a notification using a valid UUID format that doesn't
 * exist in the database.
 *
 * Steps:
 *
 * 1. Create and authenticate a member account to obtain valid authorization
 * 2. Generate a valid but non-existent notification ID (valid UUID format)
 * 3. Attempt to update the non-existent notification with valid update data
 * 4. Verify that the API returns an appropriate error response
 */
export async function test_api_notification_update_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authenticatedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Generate a valid but non-existent notification ID
  const nonExistentNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt to update the non-existent notification with valid data
  // Step 4: Verify that the API returns an appropriate error (404 Not Found)
  await TestValidator.error(
    "updating non-existent notification should fail",
    async () => {
      await api.functional.redditCommunity.member.notifications.update(
        connection,
        {
          notificationId: nonExistentNotificationId,
          body: {
            is_read: true,
          } satisfies IRedditCommunityNotification.IUpdate,
        },
      );
    },
  );
}
