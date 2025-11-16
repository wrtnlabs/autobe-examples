import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test error handling when updating a notification with an invalid UUID format.
 *
 * This test validates that the API properly rejects requests when the
 * notificationId path parameter contains a malformed UUID. The system should
 * validate UUID format at the parameter level before attempting any business
 * logic or database operations.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Attempt to update a notification using an invalid (non-UUID) notificationId
 * 3. Provide valid update data to ensure error is specifically about UUID format
 * 4. Verify that the API returns an appropriate validation error
 */
export async function test_api_notification_update_invalid_uuid(
  connection: api.IConnection,
) {
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  const invalidNotificationId = "invalid-uuid-format";

  const updateData = {
    is_read: true,
  } satisfies IRedditCommunityNotification.IUpdate;

  await TestValidator.error(
    "should reject invalid UUID format in notificationId parameter",
    async () => {
      await api.functional.redditCommunity.member.notifications.update(
        connection,
        {
          notificationId: invalidNotificationId as any,
          body: updateData,
        },
      );
    },
  );
}
