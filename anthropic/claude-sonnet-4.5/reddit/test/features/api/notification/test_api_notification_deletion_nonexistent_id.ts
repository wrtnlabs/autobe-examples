import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test notification deletion with a non-existent notification ID.
 *
 * This test validates the API's error handling when attempting to delete a
 * notification that does not exist in the system. It ensures the operation
 * returns an appropriate not-found error rather than a server error, confirming
 * idempotent behavior.
 *
 * Test Flow:
 *
 * 1. Register and authenticate as a member to obtain valid credentials
 * 2. Generate a valid UUID that does not exist in the database
 * 3. Attempt to delete the notification with the non-existent ID
 * 4. Verify that the operation fails with an appropriate error response
 */
export async function test_api_notification_deletion_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberData = {
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authenticatedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Generate a non-existent notification ID (valid UUID format)
  const nonExistentNotificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt to delete the notification with non-existent ID
  // This should fail with an error indicating the notification was not found
  await TestValidator.error(
    "deletion of non-existent notification should fail",
    async () => {
      await api.functional.redditCommunity.member.notifications.erase(
        connection,
        {
          notificationId: nonExistentNotificationId,
        },
      );
    },
  );
}
