import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserNotificationPreference";

/**
 * Verify that admin notification preference updates are always bound to the
 * authenticated adminUser and cannot be redirected to any foreign identity
 * through the request payload.
 *
 * Business context:
 *
 * - The backend derives the target notification preferences row purely from the
 *   authenticated `adminUser` actor (JWT token), not from any client-supplied
 *   identifiers.
 * - The update DTO `IDiscussionBoardAdminuserNotificationPreference.IUpdate`
 *   exposes only boolean preference flags, so clients cannot legally submit
 *   ownership or identity fields for spoofing.
 *
 * Test flow:
 *
 * 1. Register an admin user (Admin A) via POST /auth/adminUser/join. This both
 *    creates the admin in `discussion_board_adminusers` and seeds the
 *    connection with Admin A’s JWT access token.
 * 2. Perform a first PUT
 *    /discussionBoard/adminUser/notifications/adminUser/preferences call with a
 *    specific combination of flags to set Admin A’s preferences.
 * 3. Perform a second PUT to the same endpoint with a different combination of
 *    flags, representing a follow-up change by the same authenticated admin.
 *    Even though we cannot express foreign identity spoofing in the typed DTO,
 *    multiple updates through the same admin illustrate that all changes are
 *    scoped to Admin A’s row only.
 * 4. Assert that the final response matches exactly the second update’s flags, and
 *    that it differs from the first response wherever we changed values,
 *    demonstrating stable, per-admin overwrite semantics.
 */
export async function test_api_admin_notification_preferences_ignores_foreign_identity_in_payload(
  connection: api.IConnection,
) {
  // 1. Join Admin A and obtain authenticated admin context
  const joinRequest = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();
  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. First preferences update for Admin A
  const firstUpdateBody = {
    activity_notifications_enabled: true,
    digest_notifications_enabled: false,
    marketing_notifications_enabled: false,
  } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate;

  const firstPreferences: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: firstUpdateBody,
      },
    );
  typia.assert(firstPreferences);

  TestValidator.equals(
    "first update activity flag matches request",
    firstPreferences.activity_notifications_enabled,
    firstUpdateBody.activity_notifications_enabled,
  );
  TestValidator.equals(
    "first update digest flag matches request",
    firstPreferences.digest_notifications_enabled,
    firstUpdateBody.digest_notifications_enabled,
  );
  TestValidator.equals(
    "first update marketing flag matches request",
    firstPreferences.marketing_notifications_enabled,
    firstUpdateBody.marketing_notifications_enabled,
  );

  // 3. Second preferences update simulating a follow-up change
  const secondUpdateBody = {
    activity_notifications_enabled: false,
    digest_notifications_enabled: true,
    marketing_notifications_enabled: true,
  } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate;

  const secondPreferences: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: secondUpdateBody,
      },
    );
  typia.assert(secondPreferences);

  // 4. Validate that the final state reflects the second update and differs
  //    from the first where flags changed.
  TestValidator.equals(
    "second update activity flag matches request",
    secondPreferences.activity_notifications_enabled,
    secondUpdateBody.activity_notifications_enabled,
  );
  TestValidator.equals(
    "second update digest flag matches request",
    secondPreferences.digest_notifications_enabled,
    secondUpdateBody.digest_notifications_enabled,
  );
  TestValidator.equals(
    "second update marketing flag matches request",
    secondPreferences.marketing_notifications_enabled,
    secondUpdateBody.marketing_notifications_enabled,
  );

  TestValidator.notEquals(
    "activity flag changed between first and second updates",
    firstPreferences.activity_notifications_enabled,
    secondPreferences.activity_notifications_enabled,
  );
  TestValidator.notEquals(
    "digest flag changed between first and second updates",
    firstPreferences.digest_notifications_enabled,
    secondPreferences.digest_notifications_enabled,
  );
  TestValidator.notEquals(
    "marketing flag changed between first and second updates",
    firstPreferences.marketing_notifications_enabled,
    secondPreferences.marketing_notifications_enabled,
  );
}
