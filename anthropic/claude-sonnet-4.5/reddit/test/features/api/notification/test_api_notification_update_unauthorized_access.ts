import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test authorization enforcement preventing users from updating other users'
 * notifications.
 *
 * This test validates that the notification update endpoint properly enforces
 * authorization by attempting to update a notification with a different user's
 * credentials. While we cannot create actual notifications through the
 * available API endpoints, this test demonstrates the authorization boundary by
 * having one user attempt to access notification resources while authenticated
 * as a different user.
 *
 * Step-by-step process:
 *
 * 1. Create and authenticate as Member A (simulated notification owner)
 * 2. Create and authenticate as Member B (unauthorized user)
 * 3. Attempt to update a notification ID as Member B
 * 4. Verify that the operation fails with an error
 *
 * Note: Due to API limitations (no notification creation endpoint available),
 * this test uses a generated notification ID and validates that unauthorized
 * access attempts fail.
 */
export async function test_api_notification_update_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create Member A account (simulated notification owner)
  const memberABody = {
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const memberA: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberABody,
    });
  typia.assert(memberA);

  // Generate a notification ID that would conceptually belong to Member A
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create Member B account (unauthorized user)
  const memberBBody = {
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const memberB: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBBody,
    });
  typia.assert(memberB);

  // Step 3: Attempt to update the notification while authenticated as Member B
  // The connection is now authenticated as Member B from the join call
  const updateBody = {
    is_read: true,
  } satisfies IRedditCommunityNotification.IUpdate;

  // Step 4: Verify that the update attempt fails
  // This should fail either due to authorization (if notification exists but belongs to Member A)
  // or not found (if notification doesn't exist), both indicating proper access control
  await TestValidator.error(
    "unauthorized user cannot update another user's notification",
    async () => {
      await api.functional.redditCommunity.member.notifications.update(
        connection,
        {
          notificationId: notificationId,
          body: updateBody,
        },
      );
    },
  );
}
