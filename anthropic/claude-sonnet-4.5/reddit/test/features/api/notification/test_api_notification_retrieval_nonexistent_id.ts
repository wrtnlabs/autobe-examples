import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test error handling when retrieving a notification that doesn't exist.
 *
 * This test validates that the system properly handles attempts to retrieve
 * notifications using valid UUID formats that don't correspond to any existing
 * notification records in the database. It ensures robust error handling for
 * non-existent resource queries.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account to establish valid session context
 * 2. Generate a valid UUID that doesn't exist in the database
 * 3. Attempt to retrieve the non-existent notification
 * 4. Verify that the API returns an appropriate error response
 */
export async function test_api_notification_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = RandomGenerator.alphaNumeric(16);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 2: Generate a non-existent notification ID (using zero UUID)
  const nonExistentNotificationId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000";

  // Step 3: Attempt to retrieve the non-existent notification and expect an error
  await TestValidator.error(
    "retrieving non-existent notification should fail",
    async () => {
      await api.functional.redditCommunity.member.notifications.at(connection, {
        notificationId: nonExistentNotificationId,
      });
    },
  );
}
