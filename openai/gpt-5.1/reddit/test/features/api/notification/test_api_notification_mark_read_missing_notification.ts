import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotification";

/**
 * Validate error behavior when marking a non-existent notification as read.
 *
 * Business context: A member user can mark notifications as read via PUT
 * /communityPlatform/memberUser/notifications/{notificationId}/markRead but
 * should not be able to successfully mark arbitrary or non-existent
 * notifications. When the client sends a notificationId that does not
 * correspond to any notification owned by the authenticated member user, the
 * API must respond with a not-found style error (404) instead of returning a
 * notification object.
 *
 * Test workflow:
 *
 * 1. Register a new member user via POST /auth/memberUser/join, which also
 *    establishes an authenticated session and sets the Authorization header on
 *    the shared connection.
 * 2. Generate a fresh random UUID string to serve as a notificationId that should
 *    not exist in the database for this user (we never create any notifications
 *    in this test).
 * 3. Call
 *    api.functional.communityPlatform.memberUser.notifications.markRead.update
 *    with the random notificationId.
 * 4. Assert that the call fails with an HttpError carrying HTTP status 404, using
 *    TestValidator.httpError to validate the error.
 *
 * Notes:
 *
 * - We only exercise the negative (error) path here. The happy-path behavior of
 *   markRead is covered by a separate test that operates on existing
 *   notification rows.
 * - We do not and must not touch connection.headers directly; the join API is
 *   responsible for setting Authorization.
 * - All request DTOs and parameters use correct types; we never send malformed or
 *   type-incorrect data to test validation.
 */
export async function test_api_notification_mark_read_missing_notification(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Generate a random UUID to represent a non-existent notificationId.
  const missingNotificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to mark the non-existent notification as read and expect 404.
  await TestValidator.httpError(
    "markRead on non-existent notification should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.memberUser.notifications.markRead.update(
        connection,
        {
          notificationId: missingNotificationId,
        },
      );
    },
  );
}
