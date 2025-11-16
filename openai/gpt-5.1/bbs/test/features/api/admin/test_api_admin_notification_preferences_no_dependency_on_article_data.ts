import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserNotificationPreference";

/**
 * Validate that admin notification preferences can be configured in a clean
 * system with no discussion content, and that repeated updates behave
 * consistently.
 *
 * Business context:
 *
 * - Admin users should be able to configure their own notification preferences
 *   (activity, digest, marketing) as soon as their account is created.
 * - This configuration MUST NOT depend on the existence of articles, categories,
 *   comments, attachments, restrictions, or reports.
 *
 * Test process:
 *
 * 1. Join a new admin user via /auth/adminUser/join to establish an authenticated
 *    adminUser session (token is auto-attached to connection headers by SDK).
 * 2. Immediately call PUT
 *    /discussionBoard/adminUser/notifications/adminUser/preferences with a
 *    first explicit combination of the three boolean flags.
 * 3. Assert that the returned IDiscussionBoardAdminuserNotificationPreference:
 *
 *    - Passes typia.assert
 *    - Has its three *_notifications_enabled fields equal to the requested values.
 * 4. Call the same PUT endpoint again with a different combination of flags.
 * 5. Again assert that the response matches the requested combination exactly.
 * 6. Ensure no other content (articles, categories, etc.) is created at any point
 *    in this test, demonstrating lack of hidden dependencies.
 */
export async function test_api_admin_notification_preferences_no_dependency_on_article_data(
  connection: api.IConnection,
) {
  // 1. Join a new admin user to obtain an authenticated adminUser session.
  const joinRequest = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. First update: enable all notification categories.
  const firstUpdateBody = {
    activity_notifications_enabled: true,
    digest_notifications_enabled: true,
    marketing_notifications_enabled: true,
  } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate;

  const firstPreference: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: firstUpdateBody,
      },
    );
  typia.assert(firstPreference);

  TestValidator.equals(
    "first update - activity_notifications_enabled should be true",
    firstPreference.activity_notifications_enabled,
    true,
  );
  TestValidator.equals(
    "first update - digest_notifications_enabled should be true",
    firstPreference.digest_notifications_enabled,
    true,
  );
  TestValidator.equals(
    "first update - marketing_notifications_enabled should be true",
    firstPreference.marketing_notifications_enabled,
    true,
  );

  // 3. Second update: disable marketing while leaving activity and digest enabled.
  const secondUpdateBody = {
    activity_notifications_enabled: true,
    digest_notifications_enabled: true,
    marketing_notifications_enabled: false,
  } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate;

  const secondPreference: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: secondUpdateBody,
      },
    );
  typia.assert(secondPreference);

  TestValidator.equals(
    "second update - activity_notifications_enabled should remain true",
    secondPreference.activity_notifications_enabled,
    true,
  );
  TestValidator.equals(
    "second update - digest_notifications_enabled should remain true",
    secondPreference.digest_notifications_enabled,
    true,
  );
  TestValidator.equals(
    "second update - marketing_notifications_enabled should be false",
    secondPreference.marketing_notifications_enabled,
    false,
  );

  // 4. Third update: disable all notifications.
  const thirdUpdateBody = {
    activity_notifications_enabled: false,
    digest_notifications_enabled: false,
    marketing_notifications_enabled: false,
  } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate;

  const thirdPreference: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: thirdUpdateBody,
      },
    );
  typia.assert(thirdPreference);

  TestValidator.equals(
    "third update - activity_notifications_enabled should be false",
    thirdPreference.activity_notifications_enabled,
    false,
  );
  TestValidator.equals(
    "third update - digest_notifications_enabled should be false",
    thirdPreference.digest_notifications_enabled,
    false,
  );
  TestValidator.equals(
    "third update - marketing_notifications_enabled should be false",
    thirdPreference.marketing_notifications_enabled,
    false,
  );
}
