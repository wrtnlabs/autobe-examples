import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test authorization enforcement preventing users from accessing other users'
 * notifications.
 *
 * This test validates the critical security requirement that notification
 * access requires proper authentication and that users cannot arbitrarily
 * access notification IDs that may belong to other users. The system must
 * verify that the authenticated member ID from the JWT token has authorization
 * to access the requested notification.
 *
 * Test workflow:
 *
 * 1. Create Member A account
 * 2. Create Member B account
 * 3. Authenticate as Member B
 * 4. Attempt to retrieve a notification using a random UUID as Member B
 * 5. Verify that the system rejects the unauthorized/invalid access attempt
 *
 * Note: Since there is no API to create notifications in the provided
 * materials, this test validates that users cannot arbitrarily access
 * notification endpoints with random UUIDs, which tests the authorization
 * boundary enforcement.
 */
export async function test_api_notification_retrieval_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create Member A account
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberAEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(memberA);

  // Step 2: Create Member B account (the user attempting access)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberB: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberBEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(memberB);

  // Step 3: Generate a random notification ID that doesn't belong to Member B
  const arbitraryNotificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Authenticate as Member B and attempt to access the notification
  // Member B's authentication is already set from the join operation
  // The system should reject access to notifications that don't belong to Member B
  await TestValidator.error(
    "accessing non-existent or unauthorized notification should fail",
    async () => {
      await api.functional.redditCommunity.member.notifications.at(connection, {
        notificationId: arbitraryNotificationId,
      });
    },
  );
}
